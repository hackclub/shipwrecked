import Modal from "@/components/common/Modal";
import { useState, useEffect } from "react";
import { useSession } from 'next-auth/react';

interface Message {
  id: string;
  content: string;
  userId: string;
  receipientId: string;
  createdAt: string;
}

const SendModal = (props: { name: string; email: string, userId: string }) => {
  const [open, setOpen] = useState(false);
  const [message, setMessage] = useState("");
  const [history, setHistory] = useState<Message[]>([]);
  const [status, setStatus] = useState<string | null>(null);
  const { data: session } = useSession();

  useEffect(() => {
    const fetchHistory = async () => {
      try {
        const response = await fetch(`/api/admin/messages?recipientId=${props.userId}`);
        if (response.ok) {
          const messages = await response.json();
          setHistory(messages);
        } else {
          console.error('Failed to fetch messages');
        }
      } catch (error) {
        console.error('Error fetching messages:', error);
      }
    };
    
    if (open) {
      fetchHistory();
    }
  }, [props.userId, open]);

  const handleSend = async () => {
    if (!message.trim()) return;
    
    try {
      // Create message via API
      const messageResponse = await fetch("/api/admin/messages", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ 
          content: message, 
          recipientId: props.userId 
        }),
      });

      if (!messageResponse.ok) {
        throw new Error('Failed to create message');
      }

      const newMessage = await messageResponse.json();
      setHistory(prev => [...prev, newMessage]);
      setMessage("");
      setStatus(null);

      // Send email notification
      const res = await fetch("/api/admin/email", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ 
          to: props.email, 
          name: props.name, 
          reviewer: session?.user.name, 
          slackId: session?.user.id, 
          content: message 
        }),
      });
      const data = await res.json();
      setStatus(
        `Email: ${data.emailStatus}`
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
        style={{ padding: "4px 6px", paddingRight: 12,  borderRadius: 4, background: "none", border: "none", fontSize: 12, cursor: "pointer", color: "#5AC88D" }}
      >
        Send Message
      </button>
      {open && (
        <Modal
          isOpen={open}
          onClose={() => setOpen(false)}
          title="Send Message" 
        >
          {history.length === 0 ? (
            <div style={{ color: "#888" }}>No messages yet.</div>
          ) : (
            history.map((msg) => (
              <div key={msg.id} style={{ marginBottom: 8, textAlign: msg.userId === session?.user.id ? "right" : "left" }}>
                <div style={{ fontSize: 12, color: "#888" }}>{new Date(msg.createdAt).toLocaleString()}</div>
                <div
                  style={{
                    display: "inline-block",
                    background: msg.userId === session?.user.id ? "#daf1ff" : "#f1f1f1",
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