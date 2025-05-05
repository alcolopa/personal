import { Button } from '@/components/ui/button';
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import React from 'react';

const Contact: React.FC = () => {
  return (
    <section className="min-h-screen flex flex-col items-center justify-center px-6 py-16 bg-gradient-to-b from-background to-muted text-foreground">
      <div className="max-w-md w-full text-center">
        <h1 className="text-4xl font-bold mb-6">Get In Touch</h1>
        <p className="text-lg leading-relaxed mb-8">
          Interested in working together or have a project in mind?  
          I’d love to hear from you. Fill out the form below or connect with me directly!
        </p>

        {/* Contact Form */}
        <form action="https://formsubmit.co/e5633b22b917eeefdc385977c968ed3e" method='POST' className="space-y-6">
          <div className="flex flex-col text-left">
            <label htmlFor="name" className="mb-2 text-sm font-medium">Name</label>
            <Input
              type="text"
              id="name"
              name="name"
              placeholder="Your name"
              required
            />
          </div>

          <div className="flex flex-col text-left">
            <label htmlFor="email" className="mb-2 text-sm font-medium">Email</label>
            <Input
              type="email"
              name="email"
              id="email"
              placeholder="you@example.com"
              required
            />
          </div>

          <div className="flex flex-col text-left">
            <label htmlFor="message" className="mb-2 text-sm font-medium">Message</label>
            <Textarea
              id="message"
              name="message"
              rows={5}
              placeholder="Your message..."
              required
            />
          </div>
          <Input type="hidden" name="_next" value="https://emilioelmurr.com"></Input>
          <Input type="hidden" name="_subject" value="New submission!"></Input>
          <Input type="hidden" name="_captcha" value="false"></Input>
          <Input type="text" name="_honey" className="hidden"></Input>

          <Button type="submit" className="w-full">
            Send Message
          </Button>
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
