import puppeteer from 'puppeteer';
import { NextResponse } from 'next/server';

export async function POST(req) {
    let browser;
    try {
        const body = await req.json();
        const { firstName, lastName, email, phone, gender } = body;

        console.log("Launching browser...");
        browser = await puppeteer.launch({
            headless: "new", // VPS must be headless
            args: [
                '--no-sandbox', 
                '--disable-setuid-sandbox',
                '--disable-dev-shm-usage', // Prevents crashes on low-RAM VPS
                '--disable-blink-features=AutomationControlled'
            ],
            defaultViewport: { width: 1280, height: 800 } 
        });

        const page = await browser.newPage();
        await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36');

        const wait = (ms) => new Promise(resolve => setTimeout(resolve, ms));

        // Helper: Wait for Angular to stabilize (for AlohaABA)
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

        //         // =========================
        //         // 1. ALOHA ABA WORKFLOW (AngularJS + Angular Material)
        //         // =========================
                console.log("\n=== ALOHA ABA (AngularJS) ===");
                console.log("Navigating to login page...");

                await page.goto("https://identity.alohaaba.com/User/Login", { 
                    waitUntil: 'domcontentloaded',
                    timeout: 45000 
                });

                await wait(3000);
                await waitForAngular();

                // STEP 1: Enter Username
                console.log("Step 1: Entering username...");
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
                            } catch (e) {}
                        }
                    }
                });

                await wait(1000);
                await page.screenshot({ path: 'debug-1-username.png', fullPage: true });

                // STEP 2: Click Next
                console.log("Step 2: Clicking Next button...");

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
                await page.screenshot({ path: 'debug-2-after-next.png', fullPage: true });

                // STEP 3: Enter Password
                console.log("Step 3: Waiting for password field...");
                await page.waitForSelector("#loginpassword", { visible: true, timeout: 15000 });

                console.log("Entering password...");
                await page.click("#loginpassword");
                await wait(500);

                const password = process.env.ALOHA_PASS;

                // Type character by character
                for (let char of password) {
                    await page.keyboard.type(char);
                    await wait(50);
                }

                await wait(500);

                // // Fallback if typing failed
                // if (passwordValue.length === 0) {
                //     console.log("Typing failed, using direct method...");

                //     await page.evaluate((pass) => {
                //         const input = document.getElementById('loginpassword');
                //         if (input) {
                //             input.value = pass;
                //             input.dispatchEvent(new Event('input', { bubbles: true }));
                //             input.dispatchEvent(new Event('change', { bubbles: true }));

                //             if (window.angular) {
                //                 try {
                //                     const scope = angular.element(input).scope();
                //                     if (scope) {
                //                         scope.$apply(() => {
                //                             scope.ngModel = pass;
                //                         });
                //                     }
                //                 } catch (e) {}
                //             }
                //         }
                //     }, password);
                // }

                // await wait(1000);
                // await page.screenshot({ path: 'debug-3-password.png', fullPage: true });

                // STEP 4: Click Login
        console.log("Step 4: Clicking login button...");

        await page.waitForSelector("#login", { visible: true, timeout: 10000 });

        // Use Promise.all to wait for the navigation AND the click simultaneously
        await Promise.all([
            page.click("#login"),
            page.waitForNavigation({ waitUntil: 'networkidle0', timeout: 30000 }).catch(() => {}),
        ]);

        // Now that we are on the new page, wait for it to be stable
        await wait(2000); 
        await waitForAngular();

                const currentUrl = page.url();
                console.log("Current URL:", currentUrl);
                await page.screenshot({ path: 'debug-4-after-login.png', fullPage: true });

                if (currentUrl.includes('/User/Login')) {
                    throw new Error("Login failed - still on login page");
                }

                console.log("✅ Logged into AlohaABA!");

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
                await page.screenshot({ path: 'debug-5-add-staff-modal.png', fullPage: true });

                // Fill Staff Details
                console.log("Filling staff details...");

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

                await typeInAngularField("#stfclt-first-name_addStaffFirstName", firstName);
                await typeInAngularField("#stfclt-last-name_addStaffLastName", lastName);

                // Job Title: BT
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

                // Office: LTE Care Plus Inc
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

                // Gender Selection
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

                // Email
                console.log("Entering email...");
                await typeInAngularField("#email_addStaffEmail0", email);

                // Save
                console.log("Saving staff profile...");
                await page.evaluate(() => {
                    const buttons = Array.from(document.querySelectorAll('button'));
                    const saveBtn = buttons.find(b => b.textContent.trim() === 'Save');
                    if (saveBtn) saveBtn.click();
                });
                await wait(2000);
                await waitForAngular();

                // Handle confirmation modal
                try {
                    console.log("Looking for OK button...");
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
                    console.log("OK button not found or not needed");
                }

                await page.screenshot({ path: 'debug-6-aloha-complete.png', fullPage: true });
                console.log("✅ AlohaABA workflow complete!");

        // =========================
        // 2. HIRASMUS WORKFLOW (Vue.js + Quasar)
        // =========================
        console.log("\n=== HIRASMUS (Vue.js + Quasar) ===");
        console.log("Navigating to login page...");

        await page.goto("https://app.hirasmus.com/#/login", {
            waitUntil: 'domcontentloaded',
            timeout: 45000
        });

        await wait(3000);
        await page.screenshot({ path: 'debug-7-hirasmus-login.png', fullPage: true });

        // Login to Hirasmus
        console.log("Logging into Hirasmus...");
        await page.waitForSelector("input[type='email'], input[aria-label*='email' i]", { timeout: 15000 });

        await page.type("input[type='email'], input[aria-label*='email' i]", process.env.HIRASMUS_USER, { delay: 50 });
        await page.type("input[type='password']", process.env.HIRASMUS_PASS, { delay: 50 });

        await wait(500);
        await page.click("button[type='submit']");

        await wait(5000);
        await page.screenshot({ path: 'debug-8-hirasmus-logged-in.png', fullPage: true });

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

        await page.screenshot({ path: 'debug-9-users-page.png', fullPage: true });

        // Click "Invite User" Quasar dropdown
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
        await page.screenshot({ path: 'debug-10-dropdown-open.png', fullPage: true });

        // Select BT 2 from Quasar dropdown menu
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
        await page.screenshot({ path: 'debug-11-bt2-selected.png', fullPage: true });

        // Fill user details (Quasar inputs)
        console.log("Filling Hirasmus user details...");
        await page.type("input[aria-label='First Name']", firstName, { delay: 50 });
        await page.type("input[aria-label='Last Name']", lastName, { delay: 50 });
        await page.type("input[aria-label='Email*']", email, { delay: 50 });
        await page.type("input[aria-label='Phone']", phone, { delay: 50 });

        // Switch to Access tab
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

        // Link to AlohaABA profile
        console.log("Linking to AlohaABA profile...");

        await page.evaluate(() => {
            const xpath = "//button[.//span[contains(text(), 'Link to AlohaABA profile')]]";
            const result = document.evaluate(xpath, document, null, XPathResult.FIRST_ORDERED_NODE_TYPE, null);
            const btn = result.singleNodeValue;

            if (btn) {
                btn.scrollIntoView();
                btn.click(); // This is the driver.execute_script("arguments[0].click();") equivalent
            } else {
                // Fallback: broaden the search if exact XPATH fails
                const allButtons = Array.from(document.querySelectorAll('button'));
                const fallbackBtn = allButtons.find(b => b.innerText.includes('Link to AlohaABA profile'));
                if (fallbackBtn) {
                    fallbackBtn.scrollIntoView();
                    fallbackBtn.click();
                }
            }
        });

        // Give the modal time to load
        await wait(3000);

        // Check if search appeared
        const isModalOpen = await page.evaluate(() => !!document.querySelector("input[placeholder='Search']"));
        console.log("Search input detected:", isModalOpen);

        if (!isModalOpen) {
            await page.screenshot({ path: 'debug-failed-link-click.png' });
            console.log("Search modal failed to open. Check debug-failed-link-click.png");
        }

// Search for staff member
console.log(`Searching for ${firstName} ${lastName}...`);
const searchInputSelector = "input.q-placeholder[placeholder='Search']";
await page.waitForSelector(searchInputSelector, { timeout: 10000 });
await page.click(searchInputSelector);
await page.type(searchInputSelector, `${firstName} ${lastName}`, { delay: 70 });
await wait(3000);

// --- 1. Select FIRST row via clicking the radio button ---
console.log("Selecting FIRST row by clicking radio button...");
await page.waitForSelector('table tbody tr.cursor-pointer .q-radio', { timeout: 5000 });
await page.click('table tbody tr.cursor-pointer .q-radio');
await wait(1500);

// --- 2. Save link ---
console.log("Clicking 'Save' link button...");
await wait(2000); // Pause before clicking first Save

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

await wait(2000); // Wait after first Save

// --- 3. Final Save / Invite ---
console.log("Clicking Final 'Invite User' button in modal...");
await page.waitForFunction(
    () => {
        // Target the button inside the modal/dialog
        const modal = document.querySelector('.q-dialog') || document.querySelector('[role="dialog"]');
        if (!modal) return false;
        
        const xpath = ".//button[.//span[text()='Invite User']]";
        const result = document.evaluate(xpath, modal, null, XPathResult.FIRST_ORDERED_NODE_TYPE, null);
        return result.singleNodeValue !== null;
    },
    { timeout: 5000 }
);

await page.evaluate(() => {
    // Find the modal first, then search for the button inside it
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

console.log(`✅ Invited ${firstName} ${lastName}`);
await wait(3000);

await page.screenshot({ path: 'debug-12-hirasmus-complete.png', fullPage: true });
console.log("✅ Hirasmus workflow complete!");

console.log("\n🎉 ALL AUTOMATION COMPLETED SUCCESSFULLY!");
await browser.close();

return NextResponse.json({
    status: 'Success',
    message: 'BT created in both AlohaABA and Hirasmus'
});

    } catch (error) {
        console.error("\n❌ AUTOMATION ERROR:", error);

        if (browser) {
            try {
                const pages = await browser.pages();
                if (pages.length > 0) {
                    await pages[0].screenshot({ path: 'debug-error.png', fullPage: true });
                }
            } catch (e) {
                console.error("Could not take error screenshot:", e);
            }
            await browser.close();
        }

        return NextResponse.json({
            status: 'Error',
            error: error.message,
            stack: error.stack
        }, { status: 500 });
    }
}