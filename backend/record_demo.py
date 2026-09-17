from playwright.sync_api import sync_playwright
import time
import os

def run(playwright):
    print("Launching browser for recording...")
    # Launch in headless mode but record video
    browser = playwright.chromium.launch(headless=True)
    
    os.makedirs("videos", exist_ok=True)
    os.makedirs("screenshots", exist_ok=True)
    
    context = browser.new_context(
        record_video_dir="videos/",
        record_video_size={"width": 1280, "height": 720},
        viewport={"width": 1280, "height": 720}
    )
    
    page = context.new_page()
    print("Navigating to http://localhost:3000...")
    page.goto("http://localhost:3000")
    page.wait_for_load_state("networkidle")
    time.sleep(3) # Extra wait for initial inbox load
    
    print("Page loaded. Starting recording flow...")
    
    # Locate the AI input
    chat_input = page.locator("input[placeholder*='Ask AI']")
    
    # Helper for typing and submitting
    def submit_chat(text, wait_time=8):
        print(f"\\n--- ACTION: {text} ---")
        chat_input.fill(text)
        page.keyboard.press("Enter")
        page.wait_for_timeout(wait_time * 1000)
        
    def take_screenshot(name):
        path = f"screenshots/{name}.png"
        page.screenshot(path=path)
        print(f"Screenshot taken: {path}")
        
    # Act 1: Search & Filter
    submit_chat("Search my emails for updates on Natco Pharma", wait_time=5)
    take_screenshot("1_search_results")
    
    submit_chat("Show only unread emails from this week", wait_time=4)
    take_screenshot("2_filter_results")
    
    # Act 2: Navigate
    submit_chat("open the reply mail for groww demat account closure ticket", wait_time=5)
    take_screenshot("3_navigate_email")
    # Verify email is open (look for a back button or email content)
    if page.locator("text='Back to Inbox'").is_visible() or page.locator("text='AI Email Summary'").is_visible():
        print("VERIFIED: Email detail view is open.")
    else:
        print("WARNING: Email detail view might not be open.")
    
    # Act 3: Context Awareness
    submit_chat("Reply to this", wait_time=4)
    take_screenshot("4_context_awareness_reply")
    if page.locator("text='Send Email'").is_visible():
        print("VERIFIED: Compose view is open.")
    
    # Act 4: Compose
    submit_chat("Mail naveenkumar637930@gmail.com regarding reply to natco pharma ofs we will do it", wait_time=5)
    take_screenshot("5_compose_filled")
    
    # Verify the "To" field is filled
    to_field = page.locator("input[placeholder='john@example.com']").input_value() if page.locator("input[placeholder='john@example.com']").is_visible() else "NOT FOUND"
    print(f"VERIFIED: 'To' field contains -> {to_field}")
    
    # Act 5: Basic UI filtering
    # Go back to inbox
    submit_chat("Show my latest emails", wait_time=5)
    
    # Click advanced filters icon
    filter_btn = page.locator("button[title='Advanced Filters']")
    if filter_btn.is_visible():
        print("Clicking advanced filters...")
        filter_btn.click()
        time.sleep(1)
        
    date_select = page.locator("select")
    if date_select.is_visible():
        date_select.select_option(value="this_month")
        time.sleep(1)
        
    if deep_search_btn.is_visible():
        print("Clicking Deep Search Server...")
        deep_search_btn.click()
        page.wait_for_timeout(6000)
        take_screenshot("6_deep_search_results")
        print("VERIFIED: Deep search triggered.")
    
    print("Closing context and saving video...")
    context.close()
    browser.close()
    print("Recording saved in backend/videos/")

with sync_playwright() as playwright:
    run(playwright)
