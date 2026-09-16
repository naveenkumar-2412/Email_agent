'use client';

type Email = {
  id: string;
  sender: string;
  subject: string;
  preview?: string;
  body?: string; 
  date: string;
  is_read: boolean;
};

export default function EmailDetail({ email, onBack }: { email: Email | null, onBack: () => void }) {
  return (
    <div className="bg-white p-6 rounded-lg shadow h-full flex flex-col">
      <button onClick={onBack} className="text-blue-600 mb-4 hover:underline font-medium w-fit">
        ← Back to Inbox
      </button>
      
      {!email ? (
        <p className="text-gray-500">Email not found.</p>
      ) : (
        <div className="flex flex-col h-full">
          <h2 className="text-2xl font-bold mb-2 text-gray-900">{email.subject || "No Subject"}</h2>
          <div className="text-gray-500 mb-4 text-sm border-b pb-3">
            <p className="font-medium text-gray-700">From: {email.sender}</p>
            <p>{email.date ? new Date(email.date).toLocaleString() : "Recent"}</p>
          </div>
          
          {/* If you see this iframe, the HTML tables will render perfectly! */}
          <div className="flex-1 bg-white border rounded shadow-inner overflow-hidden min-h-[500px]">
            <iframe 
              title="Email Body"
              srcDoc={email.body || email.preview || "No content available."}
              className="w-full h-full border-none"
              sandbox="allow-popups allow-popups-to-escape-sandbox allow-same-origin"
            />
          </div>
        </div>
      )}
    </div>
  );
}