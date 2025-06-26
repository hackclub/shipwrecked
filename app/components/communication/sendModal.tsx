import Modal from "@/components/common/Modal";
import { useState, useCallback } from "react";
import { useSession } from 'next-auth/react';

interface Message {
  id: number;
  sender: string;
  content: string;
  timestamp: string;
}

const mockHistory: Message[] = [
  {
    id: 1,
    sender: "me",
    content: "Hey, how are you?",
    timestamp: "2024-06-25 10:00",
  },
];

const SendModal = (props: { name: string; email: string }) => {
  const [open, setOpen] = useState(false);
  const [message, setMessage] = useState("");
  const [history, setHistory] = useState<Message[]>(mockHistory);
  const [status, setStatus] = useState<string | null>(null);
  const { data: session } = useSession();
  const isSlackConnected = !!session?.user?.slack;
  const isAdmin = session?.user?.isAdmin;

  // Custom admin Slack connect handler
  const handleAdminSlackConnect = useCallback(async () => {
    try {
      const res = await fetch('/api/admin/slack/auth/admin-url');
      const data = await res.json();
      if (data.url) {
        window.location.href = data.url;
      } else {
        alert('Failed to get Slack admin OAuth URL');
      }
    } catch (e) {
      alert('Failed to connect to Slack as admin');
      console.error('Slack admin connect error:', e);
    }
  }, []);

  const handleSend = async () => {
    if (!message.trim()) return;
    const newMsg: Message = {
      id: history.length + 1,
      sender: "me",
      content: message,
      timestamp: new Date().toLocaleString(),
    };
    setHistory([...history, newMsg]);
    setMessage("");
    setStatus(null);
    try {
      const res = await fetch("/api/admin/email", {
        method: "POST",
        body: JSON.stringify({ to: props.email, name: props.name, content: message }),
      });
      const data = await res.json();
      setStatus(
        `Email: ${data.emailStatus}, Slack: ${data.slackStatus}${data.slackError ? ' (' + data.slackError + ')' : ''}`
      );
    } catch (e) {
      setStatus("Failed to send message");
      console.error('SendModal error:', e);
    }
  };

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        style={{ padding: "4px 12px", borderRadius: 4, background: "none", border: "none", fontSize: 12, cursor: "pointer" }}
      >
        Send Message
      </button>
      {open && (
        <Modal
          isOpen={open}
          onClose={() => setOpen(false)}
          title="Send Message" 
        >
          <div style={{ marginBottom: 16 }}>
            {isSlackConnected && isAdmin ? (
              <div style={{ color: 'green', fontSize: 14, marginBottom: 8 }}>✅ Connected to Slack as Admin</div>
            ) : (
              <button
                onClick={handleAdminSlackConnect}
                style={{ padding: '6px 16px', borderRadius: 4, background: '#4A154B', color: 'white', border: 'none', fontWeight: 600, cursor: 'pointer', marginBottom: 8 }}
              >
                Connect Slack (Admin)
              </button>
            )}
          </div>
          {history.length === 0 ? (
            <div style={{ color: "#888" }}>No messages yet.</div>
          ) : (
            history.map((msg) => (
              <div key={msg.id} style={{ marginBottom: 8, textAlign: msg.sender === "me" ? "right" : "left" }}>
                <div style={{ fontSize: 12, color: "#888" }}>{msg.timestamp}</div>
                <div
                  style={{
                    display: "inline-block",
                    background: msg.sender === "me" ? "#daf1ff" : "#f1f1f1",
                    borderRadius: 6,
                    padding: "6px 12px",
                    marginTop: 2,
                    maxWidth: 220,
                    wordBreak: "break-word",
                  }}
                >
                  {msg.content}
                </div>
              </div>
            ))
          )}
          <textarea
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            rows={3}
            placeholder="Type your message then hit enter..."
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                handleSend();
              }
            }}
            style={{ width: "100%", borderRadius: 4, border: "1px solid #ccc", padding: 8, marginBottom: 8 }}
          />
          {status && <div style={{ color: '#0070f3', fontSize: 12, marginTop: 4 }}>{status}</div>}
        </Modal>
      )}
    </>
  );
}

export default SendModal;