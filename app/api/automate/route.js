import puppeteer from 'puppeteer';
import { NextResponse } from 'next/server';

export async function POST(req) {
    let browser;
    try {
        const body = await req.json();
        const { firstName, lastName, email, phone, gender, payRate, endDate } = body;

        console.log("Launching browser...");
        browser = await puppeteer.launch({
            headless: false,
            args: [
                '--no-sandbox',
                '--disable-setuid-sandbox',
                '--disable-dev-shm-usage',
                '--disable-blink-features=AutomationControlled',
                '--disable-notifications'
            ],
            defaultViewport: { width: 1280, height: 800 }
        });

        const page = await browser.newPage();
        await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36');

        const wait = (ms) => new Promise(resolve => setTimeout(resolve, ms));

        // Helper: Wait for Angular to stabilize
        const waitForAngular = async () => {
            await page.evaluate(async () => {
                return new Promise((resolve) => {
                    const checkAngular = setInterval(() => {
                        if (window.getAllAngularTestabilities) {
                            const testabilities = window.getAllAngularTestabilities();
                            const allStable = testabilities.every(t => {
                                try {
                                    let isStable = false;
                                    t.whenStable(() => { isStable = true; });
                                    return isStable;
                                } catch (e) {
                                    return true;
                                }
                            });

                            if (allStable || testabilities.length === 0) {
                                clearInterval(checkAngular);
                                resolve();
                            }
                        }
                    }, 100);

                    setTimeout(() => {
                        clearInterval(checkAngular);
                        resolve();
                    }, 5000);
                });
            });
        };

        // Helper: Type in Angular field with proper event triggering
        const typeInAngularField = async (selector, text) => {
            await page.waitForSelector(selector, { visible: true, timeout: 10000 });
            await page.click(selector, { clickCount: 3 });
            await page.keyboard.press('Backspace');
            await page.type(selector, text, { delay: 50 });
            await page.evaluate((sel) => {
                const el = document.querySelector(sel);
                if (el) {
                    el.dispatchEvent(new Event('input', { bubbles: true }));
                    el.dispatchEvent(new Event('change', { bubbles: true }));
                    el.dispatchEvent(new Event('blur', { bubbles: true }));
                }
            }, selector);
            await wait(300);
        };

        // =========================
        // 1. ALOHA ABA WORKFLOW
        // =========================
        console.log("\n=== ALOHA ABA WORKFLOW ===");
        console.log("Navigating to login page...");

        await page.goto("https://identity.alohaaba.com/User/Login", {
            waitUntil: 'domcontentloaded',
            timeout: 45000
        });

        await wait(3000);
        await waitForAngular();

        // Enter Username
        console.log("Entering username...");
        await page.waitForSelector("#UserName", { visible: true, timeout: 30000 });
        await page.type("#UserName", process.env.ALOHA_USER, { delay: 50 });

        await page.evaluate(() => {
            const input = document.getElementById('UserName');
            if (input) {
                input.dispatchEvent(new Event('input', { bubbles: true }));
                input.dispatchEvent(new Event('change', { bubbles: true }));
                input.dispatchEvent(new Event('blur', { bubbles: true }));

                if (window.angular) {
                    try {
                        const scope = angular.element(input).scope();
                        if (scope) scope.$apply();
                    } catch (e) { }
                }
            }
        });

        await wait(1000);

        // Click Next
        console.log("Clicking Next button...");
        const nextClicked = await page.evaluate(() => {
            const buttons = Array.from(document.querySelectorAll('button'));
            const nextBtn = buttons.find(b =>
                b.textContent.trim() === 'Next' &&
                b.type === 'submit'
            );

            if (nextBtn) {
                nextBtn.click();
                return true;
            }
            return false;
        });

        if (!nextClicked) {
            throw new Error("Could not find Next button");
        }

        await wait(3000);
        await waitForAngular();

        // Enter Password
        console.log("Entering password...");
        await page.waitForSelector("#loginpassword", { visible: true, timeout: 15000 });
        await page.click("#loginpassword");
        await wait(500);

        const password = process.env.ALOHA_PASS;
        for (let char of password) {
            await page.keyboard.type(char);
            await wait(50);
        }

        await wait(500);

        // Click Login
        console.log("Clicking login button...");
        await page.waitForSelector("#login", { visible: true, timeout: 10000 });

        await Promise.all([
            page.click("#login"),
            page.waitForNavigation({ waitUntil: 'networkidle0', timeout: 30000 }).catch(() => { }),
        ]);

        await wait(2000);
        await waitForAngular();

        const currentUrl = page.url();
        console.log("Current URL:", currentUrl);

        if (currentUrl.includes('/User/Login')) {
            throw new Error("Login failed - still on login page");
        }

        console.log("✅ Logged into AlohaABA");

        // Navigate to Staff List
        console.log("Navigating to Staff List...");
        await page.waitForSelector("a[class*='staff-menu']", { timeout: 20000 });
        await page.click("a[class*='staff-menu']");
        await wait(1000);
        await waitForAngular();

        await page.evaluate(() => {
            const links = Array.from(document.querySelectorAll('a'));
            const staffLink = links.find(a => a.textContent.includes('Staff List'));
            if (staffLink) staffLink.click();
        });
        await wait(2000);
        await waitForAngular();

        // Open Add Staff Modal
        console.log("Opening Add Staff modal...");
        await page.waitForSelector("button[data-target='#AddStaffProfile']", { timeout: 15000 });
        await page.click("button[data-target='#AddStaffProfile']");
        await wait(2000);
        await waitForAngular();

        // Fill Staff Details
        console.log("Filling staff details...");
        await typeInAngularField("#stfclt-first-name_addStaffFirstName", firstName);
        await typeInAngularField("#stfclt-last-name_addStaffLastName", lastName);

        // Select Job Title: BT
        console.log("Selecting Job Title: BT");
        await page.click("#singleaddStaffjobTitle");
        await wait(1000);

        await page.waitForSelector("input[placeholder*='Search Job Title']", { timeout: 5000 });
        await page.type("input[placeholder*='Search Job Title']", "BT");
        await wait(1000);

        await page.evaluate(() => {
            const options = Array.from(document.querySelectorAll('md-option'));
            const btOption = options.find(opt => {
                const div = opt.querySelector('div');
                return div && div.textContent.trim() === 'BT';
            });
            if (btOption) btOption.click();
        });
        await wait(500);

        // Select Office: LTE Care Plus Inc
        console.log("Selecting Office: LTE Care Plus Inc");
        await page.click("#singleoffice");
        await wait(1000);

        await page.evaluate(() => {
            const options = Array.from(document.querySelectorAll('md-option'));
            const lteOption = options.find(opt => {
                const div = opt.querySelector('div');
                return div && div.textContent.trim() === 'LTE Care Plus Inc';
            });
            if (lteOption) lteOption.click();
        });
        await wait(500);

        // Select Gender
        console.log(`Selecting Gender: ${gender}`);
        await page.evaluate(() => {
            const labels = Array.from(document.querySelectorAll('label'));
            const genderLabel = labels.find(l => l.textContent.trim().includes('Gender'));
            if (genderLabel) {
                const select = genderLabel.closest('.md-input-container')?.querySelector('md-select') ||
                    genderLabel.parentElement?.querySelector('md-select');
                if (select) select.click();
            }
        });
        await wait(1000);

        const genderTarget = gender === "Male" ? "Male" : "Female";
        await page.evaluate((target) => {
            const options = Array.from(document.querySelectorAll('md-option'));
            const genderOption = options.find(opt => {
                const div = opt.querySelector('div');
                return div && div.textContent.trim() === target;
            });
            if (genderOption) genderOption.click();
        }, genderTarget);
        await wait(1000);

        // Enter Phone
        console.log("Entering phone...");
        await typeInAngularField("#phonenumbers_phonenumber0", phone);

        // Enter Email
        console.log("Entering email...");
        await typeInAngularField("#email_addStaffEmail0", email);

        // Save Staff Profile
        console.log("Saving staff profile...");
        await page.evaluate(() => {
            const buttons = Array.from(document.querySelectorAll('button'));
            const saveBtn = buttons.find(b => b.textContent.trim() === 'Save');
            if (saveBtn) saveBtn.click();
        });
        await wait(2000);
        await waitForAngular();

        // Handle Confirmation Modal
        try {
            console.log("Looking for confirmation...");
            await page.waitForSelector("button[ng-click='saveAction()']", { timeout: 10000 });
            await page.evaluate(() => {
                const buttons = Array.from(document.querySelectorAll('button'));
                const okBtn = buttons.find(b =>
                    b.getAttribute('ng-click') === 'saveAction()' &&
                    b.textContent.includes('OK')
                );
                if (okBtn) okBtn.click();
            });
            await wait(3000);
        } catch (e) {
            console.log("Confirmation not needed");
        }

        console.log("✅ Staff profile created");

        // =========================
        // NEW: PAY RATE WORKFLOW
        // =========================
        console.log("\n=== ADDING PAY RATE ===");

        // Wait for staff detail page to load (can be slow)
        console.log("Waiting for staff detail page to load...");
        await wait(5000); // Increased wait time for slow loading
        await waitForAngular();

        // Click on Pay Rates tab with extended timeout and retry logic
        console.log("Clicking Pay Rates tab...");
        let payRateTabClicked = false;
        let attempts = 0;
        const maxAttempts = 3;

        while (!payRateTabClicked && attempts < maxAttempts) {
            attempts++;
            console.log(`Attempt ${attempts} to click Pay Rates tab...`);

            try {
                await page.waitForSelector("a[data-target='#StaffPayrate']", { timeout: 30000 }); // Extended timeout
                payRateTabClicked = await page.evaluate(() => {
                    const payRateTab = document.querySelector("a[data-target='#StaffPayrate']");
                    if (payRateTab) {
                        payRateTab.click();
                        return true;
                    } else {
                        const links = Array.from(document.querySelectorAll('a.tabs_link'));
                        const tab = links.find(a => a.textContent.includes('Pay Rates') || a.textContent.includes('Payroll'));
                        if (tab) {
                            tab.click();
                            return true;
                        }
                    }
                    return false;
                });

                if (payRateTabClicked) {
                    await wait(3000); // Give tab time to load
                    await waitForAngular();
                    console.log("✅ Pay Rates tab clicked successfully");
                }
            } catch (e) {
                console.log(`Pay Rates tab not ready yet, waiting...`);
                await wait(5000);
            }
        }

        if (!payRateTabClicked) {
            throw new Error("Could not click Pay Rates tab after multiple attempts");
        }

        // Open Add Hourly Pay Rate modal with multiple selector attempts
        console.log("Opening Add PayRate modal...");
        await wait(2000);

        const modalOpened = await page.evaluate(() => {
            // Try the link first
            const link = document.querySelector("a[data-target='#ManageHourlyPayroll']");
            if (link) {
                link.click();
                return true;
            }

            // Try the FAB button
            const fabButton = document.querySelector("button[data-target='#ManageHourlyPayroll']");
            if (fabButton) {
                fabButton.click();
                return true;
            }

            // Try finding by text content
            const allLinks = Array.from(document.querySelectorAll('a'));
            const addPayRateLink = allLinks.find(a =>
                a.textContent.includes('Add Hourly Pay Rates')
            );
            if (addPayRateLink) {
                addPayRateLink.click();
                return true;
            }

            // Try by ng-click attribute
            const ngClickButtons = Array.from(document.querySelectorAll('[ng-click*="AddPayroll"]'));
            if (ngClickButtons.length > 0) {
                ngClickButtons[0].click();
                return true;
            }

            return false;
        });

        if (!modalOpened) {
            throw new Error("Could not find Add Hourly Pay Rate button");
        }

        console.log("✅ Pay Rate modal opened");
        await wait(2000);
        await waitForAngular();

        // Select Earning Code: Hourly
        console.log("Selecting Earning Code: Hourly");
        await page.waitForSelector("md-select[name='singlePayrollselect0']", { timeout: 10000 });
        await page.click("md-select[name='singlePayrollselect0']");
        await wait(1000);

        await page.evaluate(() => {
            const options = Array.from(document.querySelectorAll('md-option'));
            const hourlyOption = options.find(opt => {
                const div = opt.querySelector('div');
                return div && div.textContent.trim() === 'Hourly';
            });
            if (hourlyOption) hourlyOption.click();
        });
        await wait(500);

        // 1. Enter From Date (StartDate)
        console.log("Setting From Date to today...");
        const today = new Date();
        const todayFormatted = `${String(today.getMonth() + 1).padStart(2, '0')}/${String(today.getDate()).padStart(2, '0')}/${today.getFullYear()}`;

        await page.waitForSelector('aloha-datepicker-editable[ng-model*="StartDate"]', { timeout: 10000 });

        await page.evaluate((date) => {
            // Target specifically by the Angular model name
            const container = document.querySelector('aloha-datepicker-editable[ng-model*="StartDate"]');
            const input = container?.querySelector('input.md-datepicker-input');

            if (input) {
                input.value = date;
                // Trigger Angular's digest cycle
                ['input', 'change', 'blur'].forEach(event =>
                    input.dispatchEvent(new Event(event, { bubbles: true }))
                );
            }
        }, todayFormatted);

        await wait(1000); // Small pause for stability

        // 2. Enter To Date (EndDate)
        console.log(`Setting To Date to ${endDate}...`);
        const endDateObj = new Date(endDate);
        const endDateFormatted = `${String(endDateObj.getMonth() + 1).padStart(2, '0')}/${String(endDateObj.getDate()).padStart(2, '0')}/${endDateObj.getFullYear()}`;

        await page.waitForSelector('aloha-datepicker-editable[ng-model*="EndDate"]', { timeout: 10000 });

        await page.evaluate((date) => {
            // Target specifically by the Angular model name
            const container = document.querySelector('aloha-datepicker-editable[ng-model*="EndDate"]');
            const input = container?.querySelector('input.md-datepicker-input');

            if (input) {
                input.value = date;
                // Trigger Angular's digest cycle
                ['input', 'change', 'blur'].forEach(event =>
                    input.dispatchEvent(new Event(event, { bubbles: true }))
                );
            }
        }, endDateFormatted);

        await wait(500);

        // Enter Rate
        console.log(`Setting hourly rate to $${payRate}...`);
        await page.waitForSelector("input[name='Rate']", { timeout: 10000 });
        await typeInAngularField("input[name='Rate']", payRate);

        // Save Pay Rate
        console.log("Saving pay rate...");
        await page.evaluate(() => {
            const buttons = Array.from(document.querySelectorAll('button'));
            const saveBtn = buttons.find(b => b.textContent.trim() === 'Save');
            if (saveBtn) saveBtn.click();
        });
        await wait(3000);
        await waitForAngular();

        console.log("✅ Pay rate added successfully");
        console.log("✅ AlohaABA workflow complete");

        // =========================
        // 2. HIRASMUS WORKFLOW
        // =========================
        console.log("\n=== HIRASMUS WORKFLOW ===");
        console.log("Navigating to login page...");

        await page.goto("https://app.hirasmus.com/#/login", {
            waitUntil: 'domcontentloaded',
            timeout: 45000
        });

        await wait(3000);

        // Login to Hirasmus
        console.log("Logging into Hirasmus...");
        await page.waitForSelector("input[type='email'], input[aria-label*='email' i]", { timeout: 15000 });

        await page.type("input[type='email'], input[aria-label*='email' i]", process.env.HIRASMUS_USER, { delay: 50 });
        await page.type("input[type='password']", process.env.HIRASMUS_PASS, { delay: 50 });

        await wait(500);
        await page.click("button[type='submit']");
        await wait(5000);

        // Navigate to Settings > Organization > Users
        console.log("Navigating to Settings...");
        await page.waitForSelector("div[aria-label*='Settings']", { timeout: 15000 });
        await page.click("div[aria-label*='Settings']");
        await wait(1000);

        await page.waitForSelector("div[aria-label*='Organization']", { timeout: 10000 });
        await page.click("div[aria-label*='Organization']");
        await wait(1000);

        await page.waitForSelector("a[href='#/settings/users']", { timeout: 10000 });
        await page.click("a[href='#/settings/users']");
        await wait(2000);

        // Open Invite User Dropdown
        console.log("Opening Invite User dropdown...");
        const inviteBtnSelector = 'button[aria-label*="Invite User"]';
        await page.waitForSelector(inviteBtnSelector, { visible: true, timeout: 15000 });

        await page.evaluate((selector) => {
            const btn = document.querySelector(selector);
            if (btn) {
                btn.click();
            } else {
                const allBtns = Array.from(document.querySelectorAll('button.q-btn'));
                const target = allBtns.find(b => b.innerText.includes('Invite User'));
                if (target) target.click();
            }
        }, inviteBtnSelector);

        await wait(1500);

        // Select BT 2
        console.log("Selecting BT 2...");
        await page.waitForFunction(
            () => {
                const labels = Array.from(document.querySelectorAll('div.q-item__label'));
                return labels.some(l => l.textContent.trim() === 'BT 2');
            },
            { timeout: 10000 }
        );

        await page.evaluate(() => {
            const labels = Array.from(document.querySelectorAll('div.q-item__label'));
            const bt2 = labels.find(l => l.textContent.trim() === 'BT 2');
            if (bt2) {
                const item = bt2.closest('.q-item') || bt2.parentElement;
                item.click();
            }
        });

        await wait(2000);

        // Fill User Details
        console.log("Filling Hirasmus user details...");
        await page.type("input[aria-label='First Name']", firstName, { delay: 50 });
        await page.type("input[aria-label='Last Name']", lastName, { delay: 50 });
        await page.type("input[aria-label='Email*']", email, { delay: 50 });
        await page.type("input[aria-label='Phone']", phone, { delay: 50 });

        // Switch to Access Tab
        console.log("Switching to Access tab...");
        await page.evaluate(() => {
            const tabs = Array.from(document.querySelectorAll("div[role='tab']"));
            const accessTab = tabs.find(tab => {
                const label = tab.querySelector('.q-tab__label');
                return label && label.textContent.trim() === 'Access';
            });
            if (accessTab) accessTab.click();
        });
        await wait(1500);

        // Link to AlohaABA Profile
        console.log("Linking to AlohaABA profile...");
        await page.evaluate(() => {
            const xpath = "//button[.//span[contains(text(), 'Link to AlohaABA profile')]]";
            const result = document.evaluate(xpath, document, null, XPathResult.FIRST_ORDERED_NODE_TYPE, null);
            const btn = result.singleNodeValue;

            if (btn) {
                btn.scrollIntoView();
                btn.click();
            } else {
                const allButtons = Array.from(document.querySelectorAll('button'));
                const fallbackBtn = allButtons.find(b => b.innerText.includes('Link to AlohaABA profile'));
                if (fallbackBtn) {
                    fallbackBtn.scrollIntoView();
                    fallbackBtn.click();
                }
            }
        });

        await wait(3000);

        // Search for Staff Member
        console.log(`Searching for ${firstName} ${lastName}...`);
        const searchInputSelector = "input.q-placeholder[placeholder='Search']";
        await page.waitForSelector(searchInputSelector, { timeout: 10000 });
        await page.click(searchInputSelector);
        await page.type(searchInputSelector, `${firstName} ${lastName}`, { delay: 70 });
        await wait(3000);

        // Select First Row
        console.log("Selecting first matching staff member...");
        await page.waitForSelector('table tbody tr.cursor-pointer .q-radio', { timeout: 5000 });
        await page.click('table tbody tr.cursor-pointer .q-radio');
        await wait(1500);

        // Save Link
        console.log("Saving link...");
        await wait(2000);

        await page.waitForFunction(
            () => {
                const xpath = "//button[.//span[text()='Save']]";
                const result = document.evaluate(xpath, document, null, XPathResult.FIRST_ORDERED_NODE_TYPE, null);
                return result.singleNodeValue !== null;
            },
            { timeout: 5000 }
        );

        await page.evaluate(() => {
            const xpath = "//button[.//span[text()='Save']]";
            const result = document.evaluate(xpath, document, null, XPathResult.FIRST_ORDERED_NODE_TYPE, null);
            const element = result.singleNodeValue;
            if (element) {
                element.click();
            } else {
                throw new Error("Save button not found");
            }
        });

        await wait(2000);

        // Final Invite User
        console.log("Completing invitation...");
        await page.waitForFunction(
            () => {
                const modal = document.querySelector('.q-dialog') || document.querySelector('[role="dialog"]');
                if (!modal) return false;

                const xpath = ".//button[.//span[text()='Invite User']]";
                const result = document.evaluate(xpath, modal, null, XPathResult.FIRST_ORDERED_NODE_TYPE, null);
                return result.singleNodeValue !== null;
            },
            { timeout: 5000 }
        );

        await wait(3000);
        await page.evaluate(() => {
            const modal = document.querySelector('.q-dialog') || document.querySelector('[role="dialog"]');
            if (!modal) {
                throw new Error("Modal not found");
            }

            const xpath = ".//button[.//span[text()='Invite User']]";
            const result = document.evaluate(xpath, modal, null, XPathResult.FIRST_ORDERED_NODE_TYPE, null);
            const element = result.singleNodeValue;

            if (element) {
                element.click();
            } else {
                throw new Error("Invite User button not found in modal");
            }
        });

        await wait(5000);

        console.log("✅ Hirasmus workflow complete");
        console.log(`\n🎉 Successfully created BT: ${firstName} ${lastName} with pay rate $${payRate}/hr`);

        // Close browser BEFORE sending response
        if (browser) {
            await browser.close();
            console.log("Browser closed successfully");
            browser = null;
        }

        return NextResponse.json({
            status: 'success',
            message: `BT ${firstName} ${lastName} created with $${payRate}/hr pay rate`,
            data: {
                firstName,
                lastName,
                email,
                phone,
                payRate,
                endDate
            }
        });

    } catch (error) {
        console.error("\n❌ ERROR:", error.message);
        console.error("Stack:", error.stack);

        return NextResponse.json({
            status: 'error',
            message: error.message
        }, { status: 500 });
    } finally {
        if (browser) {
            try {
                await browser.close();
                console.log("Browser closed in finally block");
            } catch (closeError) {
                console.error("Error closing browser:", closeError);
            }
        }
    }
}