import { Button } from '@/components/ui/button';
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import React, { useState } from 'react';

const Contact: React.FC = () => {
  const [form, setForm] = useState({ name: '', email: '', message: '' });
  const [status, setStatus] = useState<'idle' | 'sending' | 'sent' | 'error'>('idle');

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setStatus('sending');

    try {
      const response = await fetch('https://a4e95dbcz3.execute-api.us-east-1.amazonaws.com/prod', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(form),
      });

      if (response.ok) {
        setStatus('sent');
        setForm({ name: '', email: '', message: '' });
      } else {
        setStatus('error');
      }
    } catch {
      setStatus('error');
    }
  };

  return (
    <section className="min-h-screen flex flex-col items-center justify-center px-6 py-16 bg-gradient-to-b from-background to-muted text-foreground">
      <div className="max-w-md w-full text-center">
        <h1 className="text-4xl font-bold mb-6">Get In Touch</h1>
        <p className="text-lg leading-relaxed mb-8">
          Interested in working together or have a project in mind?  
          I’d love to hear from you. Fill out the form below or connect with me directly!
        </p>

        {/* Contact Form */}
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="flex flex-col text-left">
            <label htmlFor="name" className="mb-2 text-sm font-medium">Name</label>
            <Input
              className='placeholder:text-gray'
              type="text"
              id="name"
              name="name"
              placeholder="Your name"
              value={form.name}
              onChange={handleChange}
              required
            />
          </div>

          <div className="flex flex-col text-left">
            <label htmlFor="email" className="mb-2 text-sm font-medium">Email</label>
            <Input
              className='placeholder:text-gray'
              type="email"
              id="email"
              name="email"
              placeholder="you@example.com"
              value={form.email}
              onChange={handleChange}
              required
            />
          </div>

          <div className="flex flex-col text-left">
            <label htmlFor="message" className="mb-2 text-sm font-medium">Message</label>
            <Textarea
              className='placeholder:text-gray'
              id="message"
              name="message"
              rows={5}
              placeholder="Your message..."
              value={form.message}
              onChange={handleChange}
              required
            />
          </div>

          <Button type="submit" className="w-full" disabled={status === 'sending'}>
            {status === 'sending' ? 'Sending...' : 'Send Message'}
          </Button>

          {status === 'sent' && <p className="text-green-500 text-sm">Message sent successfully!</p>}
          {status === 'error' && <p className="text-red-500 text-sm">There was an error. Please try again.</p>}
        </form>

        {/* Alternative Contact Info */}
        <div className="mt-8 text-sm text-muted-foreground">
          <p>
            or email me directly:{" "}
            <a href="mailto:dev@emilioelmurr.com" className="text-primary underline">
              dev@emilioelmurr.com
            </a>
          </p>
        </div>
      </div>
    </section>
  );
};

export default Contact;
