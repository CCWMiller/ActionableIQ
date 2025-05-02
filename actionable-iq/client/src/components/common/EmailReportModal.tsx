import React, { useState } from 'react';

interface EmailReportModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSendEmails: (emails: string[]) => Promise<any>;
  reportName: string;
}

/**
 * Modal for sending analytics reports via email
 */
const EmailReportModal: React.FC<EmailReportModalProps> = ({
  isOpen,
  onClose,
  onSendEmails,
  reportName
}) => {
  const [emailInput, setEmailInput] = useState('');
  const [emails, setEmails] = useState<string[]>([]);
  const [error, setError] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [statusMessage, setStatusMessage] = useState('');

  // Email regex pattern for validation
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

  /**
   * Add an email to the list
   */
  const handleAddEmail = () => {
    // Trim the email to remove whitespace
    const trimmedEmail = emailInput.trim();
    
    // Validate email format
    if (!emailRegex.test(trimmedEmail)) {
      setError('Please enter a valid email address');
      return;
    }
    
    // Check if email is already in the list
    if (emails.includes(trimmedEmail)) {
      setError('This email is already in the list');
      return;
    }
    
    // Check if we've reached the maximum number of emails
    if (emails.length >= 10) {
      setError('Maximum 10 email addresses allowed');
      return;
    }
    
    // Add the email to the list
    setEmails([...emails, trimmedEmail]);
    setEmailInput('');
    setError('');
  };

  /**
   * Handle input key press (Enter adds email)
   */
  const handleKeyPress = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleAddEmail();
    }
  };

  /**
   * Remove an email from the list
   */
  const handleRemoveEmail = (email: string) => {
    setEmails(emails.filter(e => e !== email));
  };

  /**
   * Handle form submission
   */
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validate that we have at least one email
    if (emails.length === 0) {
      setError('Please add at least one email address');
      return;
    }
    
    setIsSending(true);
    setStatusMessage('Sending emails...');
    setError('');
    
    try {
      await onSendEmails(emails);
      setStatusMessage('Report sent successfully!');
      
      // Reset form after successful send
      setTimeout(() => {
        setEmails([]);
        setStatusMessage('');
        onClose();
      }, 2000);
    } catch (error: any) {
      setError(error.message || 'Failed to send emails. Please try again.');
      setStatusMessage('');
    } finally {
      setIsSending(false);
    }
  };

  // Don't render anything if modal is closed
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 w-full max-w-md mx-4">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-bold">Email Report: {reportName}</h2>
          <button 
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700"
            disabled={isSending}
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        
        {statusMessage && (
          <div className="mb-4 p-2 bg-blue-50 text-blue-700 rounded">
            {statusMessage}
          </div>
        )}
        
        {error && (
          <div className="mb-4 p-2 bg-red-50 text-red-700 rounded">
            {error}
          </div>
        )}
        
        <form onSubmit={handleSubmit}>
          <div className="mb-4">
            <label className="block text-gray-700 text-sm font-bold mb-2">
              Email Addresses (max 10)
            </label>
            <div className="flex">
              <input
                type="email"
                className="shadow appearance-none border rounded-l w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Enter email address"
                value={emailInput}
                onChange={(e) => setEmailInput(e.target.value)}
                onKeyPress={handleKeyPress}
                disabled={isSending || emails.length >= 10}
              />
              <button
                type="button"
                onClick={handleAddEmail}
                className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded-r"
                disabled={isSending || emails.length >= 10 || !emailInput.trim()}
              >
                Add
              </button>
            </div>
            <p className="text-sm text-gray-500 mt-1">
              Enter up to 10 email addresses
            </p>
          </div>
          
          {emails.length > 0 && (
            <div className="mb-4">
              <label className="block text-gray-700 text-sm font-bold mb-2">
                Recipients ({emails.length}/10)
              </label>
              <div className="bg-gray-100 rounded p-2 min-h-[40px]">
                {emails.map((email) => (
                  <div key={email} className="inline-flex items-center bg-blue-100 text-blue-800 rounded-full px-3 py-1 text-sm mr-2 mb-2">
                    {email}
                    <button
                      type="button"
                      onClick={() => handleRemoveEmail(email)}
                      className="ml-2 text-blue-500 hover:text-blue-700"
                      disabled={isSending}
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}
          
          <div className="flex justify-end mt-6">
            <button
              type="button"
              onClick={onClose}
              className="bg-gray-300 hover:bg-gray-400 text-gray-800 font-bold py-2 px-4 rounded mr-2"
              disabled={isSending}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded inline-flex items-center"
              disabled={isSending || emails.length === 0}
            >
              {isSending ? (
                <>
                  <svg className="animate-spin -ml-1 mr-2 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Sending...
                </>
              ) : (
                <>
                  <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                  </svg>
                  Send Report
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default EmailReportModal; 