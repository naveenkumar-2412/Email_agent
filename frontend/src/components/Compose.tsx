export default function Compose({ draft, setDraft }: { draft: any, setDraft: any }) {
  return (
    <div className="bg-white p-6 rounded-lg shadow flex flex-col space-y-4">
      <h2 className="text-lg font-bold border-b pb-2">New Message</h2>
      <input 
        type="email" placeholder="To" value={draft.to} 
        onChange={(e) => setDraft({...draft, to: e.target.value})}
        className="border p-2 rounded" 
      />
      <input 
        type="text" placeholder="Subject" value={draft.subject} 
        onChange={(e) => setDraft({...draft, subject: e.target.value})}
        className="border p-2 rounded" 
      />
      <textarea 
        placeholder="Body" value={draft.body} rows={8}
        onChange={(e) => setDraft({...draft, body: e.target.value})}
        className="border p-2 rounded" 
      />
      <button className="bg-blue-600 text-white py-2 px-4 rounded self-start hover:bg-blue-700">
        Send Email
      </button>
    </div>
  );
}