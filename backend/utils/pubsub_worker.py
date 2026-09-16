import os
import sys
import time

sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..')))

from google.cloud import pubsub_v1
from backend.utils.mail_api_tools import get_gmail_service

# Replace asyncio.Event with a shared state dictionary
sync_state = {"last_update": time.time()}

def start_gmail_watch():
    """Instructs the Gmail API to publish mailbox push notifications to Pub/Sub."""
    try:
        service = get_gmail_service()
        project_id = os.environ.get("GCP_PROJECT_ID")
        topic_name = os.environ.get("PUBSUB_TOPIC")
        
        if not project_id or not topic_name:
            print("⚠️ Missing GCP_PROJECT_ID or PUBSUB_TOPIC in environment.")
            return
            
        request = {
            "labelIds": ["INBOX"],
            "topicName": f"projects/{project_id}/topics/{topic_name}"
        }
        service.users().watch(userId="me", body=request).execute()
        print("✅ Gmail Watch successfully activated.")
    except Exception as e:
        print(f"⚠️ Could not start Gmail watch: {e}")

def listen_for_emails():
    """Background subscriber thread pulling incoming push notifications from Pub/Sub."""
    project_id = os.environ.get("GCP_PROJECT_ID")
    subscription_id = os.environ.get("PUBSUB_SUBSCRIPTION")
    
    if not project_id or not subscription_id:
        print("⚠️ Missing GCP_PROJECT_ID or PUBSUB_SUBSCRIPTION in environment.")
        return

    subscriber = pubsub_v1.SubscriberClient()
    subscription_path = subscriber.subscription_path(project_id, subscription_id)

    def callback(message):
        print("📬 Pub/Sub Notification Received! New inbox activity detected.")
        message.ack()
        # Safely update the shared timestamp so all React clients get notified
        sync_state["last_update"] = time.time()

    print(f"🎧 Listening for real-time emails on {subscription_id}...")
    future = subscriber.subscribe(subscription_path, callback=callback)
    try:
        future.result()
    except Exception as e:
        print(f"Pub/Sub listener error: {e}")
        future.cancel()