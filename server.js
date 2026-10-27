const express = require("express");
const path = require("path");
const Database = require("better-sqlite3");
const bcrypt = require("bcryptjs");

const app = express();
const PORT = process.env.PORT || 3000;

// ==========================================
// DATABASE
// ==========================================

const db = new Database(
    path.join(__dirname, "trusttag.db")
);

console.log("SQLite database connected.");


// ==========================================
// CREATE USERS TABLE
// ==========================================

db.prepare(`
    CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        email TEXT UNIQUE NOT NULL,
        password TEXT NOT NULL,
        role TEXT DEFAULT 'user',
        created_at TEXT DEFAULT CURRENT_TIMESTAMP
    )
`).run();


// ==========================================
// CREATE PRODUCTS TABLE
// ==========================================

db.prepare(`
    CREATE TABLE IF NOT EXISTS products (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        product_id TEXT UNIQUE NOT NULL,
        brand TEXT NOT NULL,
        name TEXT NOT NULL,
        status TEXT NOT NULL,
        created_at TEXT DEFAULT CURRENT_TIMESTAMP
    )
`).run();


// ==========================================
// OLD DATABASE CHECK
// Add brand column if it does not exist
// ==========================================

const productColumns = db
    .prepare(`PRAGMA table_info(products)`)
    .all();

const hasBrandColumn = productColumns.some(
    column => column.name === "brand"
);

if (!hasBrandColumn) {

    db.prepare(`
        ALTER TABLE products
        ADD COLUMN brand TEXT DEFAULT 'Unknown'
    `).run();

    console.log("Brand column added to products table.");
}


// ==========================================
// CREATE REPORTS TABLE
// ==========================================

db.prepare(`
    CREATE TABLE IF NOT EXISTS reports (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        product_id TEXT NOT NULL,
        reason TEXT NOT NULL,
        description TEXT,
        status TEXT DEFAULT 'Pending',
        created_at TEXT DEFAULT CURRENT_TIMESTAMP
    )
`).run();


// ==========================================
// DEFAULT ADMIN
// ==========================================

const adminEmail = "admin@trusttag.com";
const adminPassword = "admin123";

const adminExists = db.prepare(`
    SELECT id
    FROM users
    WHERE email = ?
`).get(adminEmail);

if (!adminExists) {

    const hashedPassword =
        bcrypt.hashSync(adminPassword, 10);

    db.prepare(`
        INSERT INTO users
        (email, password, role)
        VALUES (?, ?, ?)
    `).run(
        adminEmail,
        hashedPassword,
        "admin"
    );

    console.log("Default admin created.");
}


// ==========================================
// DEFAULT PRODUCT
// ==========================================

const productExists = db.prepare(`
    SELECT id
    FROM products
    WHERE product_id = ?
`).get("TRUST123");

if (!productExists) {

    db.prepare(`
        INSERT INTO products
        (
            product_id,
            brand,
            name,
            status
        )
        VALUES (?, ?, ?, ?)
    `).run(
        "TRUST123",
        "TrustTag",
        "Demo Product",
        "Genuine"
    );

    console.log("Default product created.");
}


// ==========================================
// MIDDLEWARE
// ==========================================

app.use(express.json());

app.use(
    express.urlencoded({
        extended: true
    })
);


// ==========================================
// PUBLIC FOLDER
// ==========================================

app.use(
    express.static(
        path.join(__dirname, "public")
    )
);


// ==========================================
// HOME PAGE
// ==========================================

app.get("/", (req, res) => {

    res.sendFile(
        path.join(
            __dirname,
            "public",
            "login.html"
        )
    );

});


// ==========================================
// TEST
// ==========================================

app.get("/api/test", (req, res) => {

    res.json({
        success: true,
        message: "TrustTag AI Backend is Working"
    });

});


// ==========================================
// REGISTER
// ==========================================

app.post("/api/register", async (req, res) => {

    try {

        const {
            email,
            password
        } = req.body;

        if (!email || !password) {

            return res.status(400).json({
                success: false,
                message: "Email and password are required."
            });

        }

        const cleanEmail =
            email.trim().toLowerCase();

        if (!cleanEmail.includes("@")) {

            return res.status(400).json({
                success: false,
                message: "Please enter a valid email address."
            });

        }

        if (password.length < 6) {

            return res.status(400).json({
                success: false,
                message: "Password must be at least 6 characters."
            });

        }

        const existingUser = db.prepare(`
            SELECT id
            FROM users
            WHERE email = ?
        `).get(cleanEmail);

        if (existingUser) {

            return res.status(409).json({
                success: false,
                message: "This email is already registered."
            });

        }

        const hashedPassword =
            await bcrypt.hash(password, 10);

        const result = db.prepare(`
            INSERT INTO users
            (
                email,
                password,
                role
            )
            VALUES (?, ?, ?)
        `).run(
            cleanEmail,
            hashedPassword,
            "user"
        );

        res.status(201).json({

            success: true,

            message: "Registration successful.",

            user: {
                id: result.lastInsertRowid,
                email: cleanEmail,
                role: "user"
            }

        });

    } catch (error) {

        console.log("Registration error:", error);

        res.status(500).json({
            success: false,
            message: "Registration failed."
        });

    }

});


// ==========================================
// LOGIN
// ==========================================

app.post("/api/login", async (req, res) => {

    try {

        const {
            email,
            password
        } = req.body;

        if (!email || !password) {

            return res.status(400).json({
                success: false,
                message: "Email and password are required."
            });

        }

        const cleanEmail =
            email.trim().toLowerCase();

        const user = db.prepare(`
            SELECT
                id,
                email,
                password,
                role
            FROM users
            WHERE email = ?
        `).get(cleanEmail);

        if (!user) {

            return res.status(401).json({
                success: false,
                message: "Invalid email or password."
            });

        }

        const passwordMatch =
            await bcrypt.compare(
                password,
                user.password
            );

        if (!passwordMatch) {

            return res.status(401).json({
                success: false,
                message: "Invalid email or password."
            });

        }


        // ADMIN LOGIN

        if (user.role === "admin") {

            return res.json({

                success: true,

                message: "Admin login successful.",

                user: {
                    id: user.id,
                    email: user.email,
                    role: user.role
                },

                redirect: "dashboard.html"

            });

        }


        // NORMAL USER LOGIN

        res.json({

            success: true,

            message: "Login successful.",

            user: {
                id: user.id,
                email: user.email,
                role: user.role
            },

            redirect: "index.html"

        });

    } catch (error) {

        console.log("Login error:", error);

        res.status(500).json({
            success: false,
            message: "Login failed."
        });

    }

});


// ==========================================
// VERIFY PRODUCT
// ==========================================

app.post("/api/verify-product", (req, res) => {
    const productId = req.body.productId;

    if (typeof productId !== "string" || !productId.trim()) {
        return res.status(400).json({
            success: false,
            message: "Product ID is required."
        });
    }

    const cleanProductId = productId.trim();

    const product = db.prepare(`
        SELECT product_id, brand, name, status
        FROM products
        WHERE product_id = ?
    `).get(cleanProductId);

    // Unknown product ko genuine kabhi mat batao
    if (!product) {
        return res.status(404).json({
            success: false,
            genuine: false,
            status: "Unknown",
            message: "Product record not found. Authenticity could not be verified."
        });
    }

    const status = String(product.status).trim().toLowerCase();

    // Sirf verified database record ko Genuine dikhana
    if (status !== "genuine") {
        return res.json({
            success: true,
            genuine: false,
            status: product.status,
            message: "Product is not verified as genuine.",
            product: {
                productId: product.product_id,
                brand: product.brand,
                name: product.name,
                status: product.status
            }
        });
    }

    return res.json({
        success: true,
        genuine: true,
        status: "Genuine",
        message: "Registered product record found.",
        product: {
            productId: product.product_id,
            brand: product.brand,
            name: product.name,
            status: product.status
        }
    });
});

// ==========================================
// GET ALL PRODUCTS
// ==========================================

app.get("/api/products", (req, res) => {

    const products = db.prepare(`
        SELECT
            id,
            product_id AS productId,
            brand,
            name,
            status,
            created_at AS createdAt
        FROM products
        ORDER BY id DESC
    `).all();

    res.json({

        success: true,

        total: products.length,

        products: products

    });

});


// ==========================================
// ADD PRODUCT
// ==========================================

app.post("/api/products", (req, res) => {

    const {
        productId,
        brand,
        name,
        status
    } = req.body;

    if (
        !productId ||
        !brand ||
        !name ||
        !status
    ) {

        return res.status(400).json({

            success: false,

            message:
                "Product ID, brand, name and status are required."

        });

    }

    try {

        const result = db.prepare(`
            INSERT INTO products
            (
                product_id,
                brand,
                name,
                status
            )
            VALUES (?, ?, ?, ?)
        `).run(

            productId.trim(),

            brand.trim(),

            name.trim(),

            status.trim()

        );

        res.status(201).json({

            success: true,

            message: "Product added successfully.",

            id: result.lastInsertRowid

        });

    } catch (error) {

        res.status(409).json({

            success: false,

            message: "Product ID already exists."

        });

    }

});


// ==========================================
// SUBMIT REPORT
// ==========================================

app.post("/api/reports", (req, res) => {

    const {
        productId,
        reason,
        description
    } = req.body;

    if (!productId || !reason) {

        return res.status(400).json({

            success: false,

            message:
                "Product ID and reason are required."

        });

    }

    const result = db.prepare(`
        INSERT INTO reports
        (
            product_id,
            reason,
            description,
            status
        )
        VALUES (?, ?, ?, ?)
    `).run(

        productId.trim(),

        reason.trim(),

        description || "",

        "Pending"

    );

    res.status(201).json({

        success: true,

        message: "Report submitted successfully.",

        reportId:
            result.lastInsertRowid

    });

});


// ==========================================
// GET REPORTS
// ==========================================

app.get("/api/reports", (req, res) => {

    const reports = db.prepare(`
        SELECT
            id,
            product_id AS productId,
            reason,
            description,
            status,
            created_at AS date
        FROM reports
        ORDER BY id DESC
    `).all();

    res.json({

        success: true,

        total: reports.length,

        reports: reports

    });

});


// ==========================================
// UPDATE REPORT STATUS
// ==========================================

app.put("/api/reports/:id", (req, res) => {

    const {
        status
    } = req.body;

    const allowedStatuses = [
        "Pending",
        "Resolved",
        "Rejected"
    ];

    if (!allowedStatuses.includes(status)) {

        return res.status(400).json({

            success: false,

            message: "Invalid status."

        });

    }

    const result = db.prepare(`
        UPDATE reports
        SET status = ?
        WHERE id = ?
    `).run(
        status,
        req.params.id
    );

    if (result.changes === 0) {

        return res.status(404).json({

            success: false,

            message: "Report not found."

        });

    }

    res.json({

        success: true,

        message: "Report status updated successfully."

    });

});


// ==========================================
// API 404
// ==========================================

app.use("/api", (req, res) => {

    res.status(404).json({

        success: false,

        message: "API endpoint not found."

    });

});


// ==========================================
// START SERVER
// ==========================================

app.listen(PORT, () => {

    console.log("");
    console.log("====================================");
    console.log("TrustTag AI Server Started");
    console.log("====================================");

    console.log(
        `Server: http://localhost:${PORT}`
    );

    console.log(
        "Database: trusttag.db"
    );

    console.log(
        "Admin Email: admin@trusttag.com"
    );

    console.log(
        "Admin Password: admin123"
    );

    console.log("====================================");

});