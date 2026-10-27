// ==========================================
// TRUSTTAG AI - MAIN JAVASCRIPT
// ==========================================


// ==========================================
// HOME PAGE
// ==========================================

const learnButton = document.querySelector(".learn-btn");

if (learnButton) {

    learnButton.addEventListener("click", () => {

        const features =
            document.querySelector(".features");

        if (features) {

            features.scrollIntoView({
                behavior: "smooth"
            });

        }

    });

}


// ==========================================
// QR / BARCODE SCANNER
// ==========================================

const startScan =
    document.getElementById("startScan");

const stopScan =
    document.getElementById("stopScan");

const scannerArea =
    document.getElementById("scannerArea");

const scanStatus =
    document.getElementById("scanStatus");

const result =
    document.getElementById("result");

const productId =
    document.getElementById("productId");

const verifyProduct =
    document.getElementById("verifyProduct");

let html5QrCode = null;


// ==========================================
// START SCANNER
// ==========================================

if (startScan) {

    startScan.addEventListener(
        "click",
        async () => {

            try {

                if (
                    typeof Html5Qrcode ===
                    "undefined"
                ) {

                    alert(
                        "Scanner library load nahi hui."
                    );

                    return;

                }


                scannerArea.style.display =
                    "block";


                scanStatus.textContent =
                    "📷 Camera start ho raha hai...";


                html5QrCode =
                    new Html5Qrcode("reader");


                await html5QrCode.start(

                    {
                        facingMode:
                            "environment"
                    },

                    {
                        fps: 10,
                        qrbox: 250
                    },

                    (decodedText) => {

                        console.log(
                            "Scanned:",
                            decodedText
                        );


                        productId.value =
                            decodedText;


                        scanStatus.textContent =
                            "✅ Product code scanned!";


                        result.innerHTML = `
                            <div class="success-result">

                                <h3>
                                    ✅ Code Detected
                                </h3>

                                <p>
                                    Product ID:
                                    <strong>
                                        ${decodedText}
                                    </strong>
                                </p>

                            </div>
                        `;


                        stopScanner();

                    },

                    () => {}

                );


                scanStatus.textContent =
                    "📷 Camera running. QR/Barcode ke saamne rakho.";

            }

            catch (error) {

                console.error(
                    "Scanner Error:",
                    error
                );


                scannerArea.style.display =
                    "none";


                alert(
                    "Camera start nahi ho saka. Camera permission Allow karo."
                );

            }

        }
    );

}


// ==========================================
// STOP SCANNER
// ==========================================

async function stopScanner() {

    if (html5QrCode) {

        try {

            await html5QrCode.stop();

            await html5QrCode.clear();

        }

        catch (error) {

            console.log(
                "Scanner Stop Error:",
                error
            );

        }


        html5QrCode = null;

    }


    if (scannerArea) {

        scannerArea.style.display =
            "none";

    }


    if (scanStatus) {

        scanStatus.textContent =
            "Camera scanner ready";

    }

}


if (stopScan) {

    stopScan.addEventListener(
        "click",
        stopScanner
    );

}


// ==========================================
// PRODUCT VERIFICATION
// ==========================================

if (verifyProduct) {

    verifyProduct.addEventListener(
        "click",
        async () => {

            const id =
                productId.value.trim();


            if (id === "") {

                result.innerHTML = `
                    <div class="error-result">

                        <h3>
                            ⚠️ Product ID Required
                        </h3>

                        <p>
                            Please enter Product ID.
                        </p>

                    </div>
                `;

                return;

            }


            // Loading

            result.innerHTML = `
                <div class="success-result">

                    <h3>
                        ⏳ Checking Product...
                    </h3>

                    <p>
                        Please wait...
                    </p>

                </div>
            `;


            // Disable button

            verifyProduct.disabled =
                true;


            try {

                const response =
                    await fetch(
                        "/api/verify-product",
                        {

                            method:
                                "POST",

                            headers: {

                                "Content-Type":
                                    "application/json"

                            },

                            body:
                                JSON.stringify({

                                    productId:
                                        id

                                })

                        }
                    );


                if (!response.ok) {

                    throw new Error(
                        "Server returned an error."
                    );

                }


                const data =
                    await response.json();


                console.log(
                    "Verification Response:",
                    data
                );


                // ==================================
                // GENUINE PRODUCT
                // ==================================

                if (
                    data.success === true &&
                    data.genuine === true
                ) {

                    result.innerHTML = `
                        <div class="success-result">

                            <h3>
                                ✅ Genuine Product
                            </h3>

                            <p>
                                ${data.message}
                            </p>

                            <p>
                                Product ID:
                                <strong>
                                    ${data.product.productId}
                                </strong>
                            </p>

                            <p>
                                Product Name:
                                <strong>
                                    ${data.product.name}
                                </strong>
                            </p>

                            <p>
                                Status:
                                <strong>
                                    ${data.product.status}
                                </strong>
                            </p>

                        </div>
                    `;

                }


                // ==================================
                // PRODUCT NOT VERIFIED
                // ==================================

                else {

                    result.innerHTML = `
                        <div class="error-result">

                            <h3>
                                ❌ Product Not Verified
                            </h3>

                            <p>
                                ${data.message}
                            </p>

                            <p>
                                Product ID:
                                <strong>
                                    ${id}
                                </strong>
                            </p>

                        </div>
                    `;

                }

            }

            catch (error) {

                console.error(
                    "Verification Error:",
                    error
                );


                result.innerHTML = `
                    <div class="error-result">

                        <h3>
                            ⚠️ Server Error
                        </h3>

                        <p>
                            Backend se connection nahi ho raha.
                        </p>

                    </div>
                `;

            }

            finally {

                verifyProduct.disabled =
                    false;

            }

        }
    );

}


// ==========================================
// REPORT PRODUCT
// ==========================================

const submitReport =
    document.getElementById(
        "submitReport"
    );


if (submitReport) {

    submitReport.addEventListener(
        "click",
        async (event) => {

            // Prevent page reload

            event.preventDefault();


            const reportProductInput =
                document.getElementById(
                    "reportProductId"
                );


            const reportReasonInput =
                document.getElementById(
                    "reportReason"
                );


            const reportDescriptionInput =
                document.getElementById(
                    "reportDescription"
                );


            const reportResult =
                document.getElementById(
                    "reportResult"
                );


            if (
                !reportProductInput ||
                !reportReasonInput ||
                !reportDescriptionInput ||
                !reportResult
            ) {

                console.error(
                    "Report form elements not found."
                );

                return;

            }


            const reportProductId =
                reportProductInput.value.trim();


            const reportReason =
                reportReasonInput.value;


            const reportDescription =
                reportDescriptionInput.value.trim();


            // ==================================
            // VALIDATION
            // ==================================

            if (reportProductId === "") {

                reportResult.innerHTML = `
                    <div class="error-result">

                        <h3>
                            ⚠️ Product ID Required
                        </h3>

                        <p>
                            Please enter Product ID.
                        </p>

                    </div>
                `;

                return;

            }


            if (reportReason === "") {

                reportResult.innerHTML = `
                    <div class="error-result">

                        <h3>
                            ⚠️ Reason Required
                        </h3>

                        <p>
                            Please select a reason.
                        </p>

                    </div>
                `;

                return;

            }


            // ==================================
            // LOADING
            // ==================================

            reportResult.innerHTML = `
                <div class="success-result">

                    <h3>
                        ⏳ Submitting Report...
                    </h3>

                    <p>
                        Please wait...
                    </p>

                </div>
            `;


            submitReport.disabled =
                true;


            try {

                // ==================================
                // SEND REPORT TO SQLITE BACKEND
                // ==================================

                const response =
                    await fetch(
                        "/api/reports",
                        {

                            method:
                                "POST",

                            headers: {

                                "Content-Type":
                                    "application/json"

                            },

                            body:
                                JSON.stringify({

                                    productId:
                                        reportProductId,

                                    reason:
                                        reportReason,

                                    description:
                                        reportDescription

                                })

                        }
                    );


                if (!response.ok) {

                    throw new Error(
                        "Server returned an error."
                    );

                }


                const data =
                    await response.json();


                console.log(
                    "Report Response:",
                    data
                );


                // ==================================
                // SUCCESS
                // ==================================

                if (data.success) {

                    reportResult.innerHTML = `
                        <div class="success-result">

                            <h3>
                                ✅ Report Submitted
                            </h3>

                            <p>
                                Thank you for helping
                                us identify suspicious
                                products.
                            </p>

                            <p>
                                Product ID:
                                <strong>
                                    ${reportProductId}
                                </strong>
                            </p>

                            <p>
                                Report ID:
                                <strong>
                                    #${data.report.id}
                                </strong>
                            </p>

                            <p>
                                Status:
                                <strong>
                                    ${data.report.status}
                                </strong>
                            </p>

                        </div>
                    `;


                    // Clear form

                    reportProductInput.value =
                        "";

                    reportReasonInput.value =
                        "";

                    reportDescriptionInput.value =
                        "";

                }


                // ==================================
                // FAILED
                // ==================================

                else {

                    reportResult.innerHTML = `
                        <div class="error-result">

                            <h3>
                                ❌ Report Failed
                            </h3>

                            <p>
                                ${data.message}
                            </p>

                        </div>
                    `;

                }

            }

            catch (error) {

                console.error(
                    "Report Error:",
                    error
                );


                reportResult.innerHTML = `
                    <div class="error-result">

                        <h3>
                            ⚠️ Server Error
                        </h3>

                        <p>
                            Backend se connection nahi ho raha.
                        </p>

                    </div>
                `;

            }

            finally {

                submitReport.disabled =
                    false;

            }

        }
    );

}