export default function Inbox({ emails, onOpen }: { emails: any[], onOpen: (id: string) => void }) {
  if (emails.length === 0) {
    return <div className="p-8 text-center text-gray-500 bg-white rounded-lg shadow">No emails to display. Ask the assistant to fetch them!</div>;
  }

  return (
    <div className="bg-white rounded-lg shadow overflow-hidden">
      {emails.map((email) => (
        <div key={email.id} onClick={() => onOpen(email.id)} className="p-4 border-b hover:bg-blue-50 cursor-pointer">
          <div className="flex justify-between mb-1">
            <span className="font-bold">{email.sender}</span>
            <span className="text-sm text-gray-500">{new Date(email.date).toLocaleDateString()}</span>
          </div>
          <div className="font-semibold">{email.subject}</div>
          <div className="text-gray-600 text-sm truncate">{email.preview}</div>
        </div>
      ))}
    </div>
  );
}