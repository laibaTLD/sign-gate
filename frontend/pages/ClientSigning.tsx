
import React, { useState, useEffect, useRef } from 'react';
import { useParams, useLocation } from 'react-router-dom';
import { DocumentData, DocumentStatus } from '../types';
import { DocumentsAPI, AuthAPI } from '../services/api';
import { PenTool, Upload, RefreshCw, CheckCircle, Lock } from 'lucide-react';

export default function ClientSigning() {
  const { token: pathToken } = useParams<{ token: string }>();
  const location = useLocation();
  const [doc, setDoc] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  
  // Auth State
  const [email, setEmail] = useState('');
  const [authenticated, setAuthenticated] = useState(false);
  const [authError, setAuthError] = useState('');

  // Signing State
  const [signingMethod, setSigningMethod] = useState<'draw' | 'upload'>('draw');
  const [signatureData, setSignatureData] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);

  // Canvas Refs
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const isDrawing = useRef(false);

  // Parse docId and token from hash: #/sign/:id?token=...
  const parseIds = () => {
    const rawHash = location.hash || window.location.hash || '';
    const withoutHash = rawHash.startsWith('#') ? rawHash.slice(1) : rawHash; // '/sign/:id?token=...'
    const [pathPart, queryPart] = withoutHash.split('?');
    const pathSegments = (pathPart || '').split('/'); // ['', 'sign', ':id']
    const docId = pathSegments[2] || '';
    const params = new URLSearchParams(queryPart || '');
    const t = params.get('token') || '';
    return { docId, token: t };
  };

  useEffect(() => {
    const load = async () => {
      try {
        const { docId, token } = parseIds();
        if (!docId || !token) {
          setError('Invalid Document Link');
          setLoading(false);
          return;
        }
        const resp = await DocumentsAPI.getPublic(docId, token);
        setDoc({ ...resp.document, _id: docId, signToken: token });
      } catch (e: any) {
        setError('Invalid Document Link');
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [location.key]);
  
  // Classic OAuth popup: open backend Google login URL and wait for postMessage
  const handleGoogleClick = () => {
    const { docId } = parseIds();
    if (!docId) {
      setAuthError('Invalid document link.');
      return;
    }

    const apiBase = (import.meta as any).env?.VITE_API_URL || 'http://localhost:5000/api';
    const url = `${apiBase}/auth/google-login?${new URLSearchParams({ docId }).toString()}`;
    const popup = window.open(url, 'google-oauth', 'width=500,height=600');
    if (!popup) {
      setAuthError('Popup blocked. Please allow popups for this site and try again.');
    }
  };

  // Listen for OAuth result from popup
  useEffect(() => {
    const handler = (event: MessageEvent) => {
      // Accept messages only from backend origin in local dev
      const apiBase = (import.meta as any).env?.VITE_API_URL || 'http://localhost:5000/api';
      try {
        const apiOrigin = new URL(apiBase).origin;
        if (event.origin !== apiOrigin) return;
      } catch {
        // If URL parsing fails, ignore origin check
      }

      const data: any = event.data || {};
      if (data.type !== 'google-oauth-result') return;

      if (data.ok && data.email) {
        setEmail(String(data.email));
        setAuthenticated(true);
        setAuthError('');
      } else {
        setAuthenticated(false);
        setAuthError(data.message || 'Google sign-in failed.');
      }
    };

    window.addEventListener('message', handler);
    return () => window.removeEventListener('message', handler);
  }, [setAuthenticated, setEmail, setAuthError]);

  // Canvas Logic
  const startDrawing = (e: React.MouseEvent | React.TouchEvent) => {
    isDrawing.current = true;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    
    const rect = canvas.getBoundingClientRect();
    const x = ('touches' in e ? e.touches[0].clientX : e.clientX) - rect.left;
    const y = ('touches' in e ? e.touches[0].clientY : e.clientY) - rect.top;
    
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineWidth = 2;
    ctx.lineCap = 'round';
    ctx.strokeStyle = 'black';
  };

  const draw = (e: React.MouseEvent | React.TouchEvent) => {
    if (!isDrawing.current || !canvasRef.current) return;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const rect = canvas.getBoundingClientRect();
    const x = ('touches' in e ? e.touches[0].clientX : e.clientX) - rect.left;
    const y = ('touches' in e ? e.touches[0].clientY : e.clientY) - rect.top;

    ctx.lineTo(x, y);
    ctx.stroke();
  };

  const stopDrawing = () => {
    isDrawing.current = false;
    if (canvasRef.current) {
      setSignatureData(canvasRef.current.toDataURL('image/png'));
    }
  };

  const clearCanvas = () => {
    const canvas = canvasRef.current;
    if (canvas) {
      const ctx = canvas.getContext('2d');
      ctx?.clearRect(0, 0, canvas.width, canvas.height);
      setSignatureData(null);
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      const img = new Image();
      img.onload = () => {
        // Normalize to PNG on a white background to ensure visibility and pdf-lib compatibility
        const MAX_W = 600;
        const MAX_H = 200;
        let w = img.width;
        let h = img.height;
        const ratio = Math.min(MAX_W / w, MAX_H / h, 1);
        w = Math.max(1, Math.round(w * ratio));
        h = Math.max(1, Math.round(h * ratio));
        const c = document.createElement('canvas');
        c.width = MAX_W;
        c.height = MAX_H;
        const ctx = c.getContext('2d');
        if (!ctx) return;
        // white background then center the signature image
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, c.width, c.height);
        const x = Math.round((MAX_W - w) / 2);
        const y = Math.round((MAX_H - h) / 2);
        ctx.drawImage(img, x, y, w, h);
        const data = c.toDataURL('image/png');
        setSignatureData(data);
      };
      img.src = reader.result as string;
    };
    reader.readAsDataURL(file);
  };

  const submitSignature = async () => {
    if (!doc || !signatureData) return;
    setSubmitting(true);
    
    try {
      // Send signature with signer email
      await DocumentsAPI.sign(doc._id || doc.id, { 
        dataUrl: signatureData, 
        token: doc.signToken,
        signerEmail: email // Send the authenticated email
      });
      
      setSuccess(true);
    } catch (err) {
      console.error(err);
      alert('Failed to sign document');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) return <div className="p-10 text-center text-brand-700">Loading Secure Document...</div>;
  if (error || !doc) return <div className="p-10 text-center text-red-600 font-bold">{error || 'Document not found'}</div>;
  if (doc.status === DocumentStatus.SIGNED && !success) {
    return (
        <div className="min-h-screen bg-brand-50 flex items-center justify-center p-4">
            <div className="bg-white p-8 rounded-lg shadow text-center max-w-md border border-brand-100">
                <CheckCircle size={48} className="text-yellow-400 mx-auto mb-4" />
                <h2 className="text-2xl font-bold mb-2">Already Signed</h2>
                <p className="text-gray-600 mb-6">This document was signed on {new Date(doc.signedAt!).toLocaleString()}.</p>
                {doc.signedPdfUrl && (
                  <a 
                    href={`data:application/pdf;base64,${doc.signedPdfUrl}`} 
                    download="signed_document.pdf"
                    className="bg-yellow-400 text-brand-900 px-4 py-2 rounded hover:bg-yellow-300"
                  >
                    Download Copy
                  </a>
                )}
            </div>
        </div>
    );
  }

  // --- Step 1: Authentication ---
  if (!authenticated) {
    return (
      <div className="min-h-screen bg-brand-50 flex flex-col justify-center items-center p-4">
        <div className="bg-white p-8 rounded-lg shadow-md max-w-md w-full border border-brand-100">
          <div className="text-center mb-6">
            <Lock size={40} className="mx-auto text-yellow-400 mb-2" />
            <h2 className="text-xl font-bold">Secure Document Access</h2>
            <p className="text-sm text-brand-500 mt-2">You have been invited to sign <b>{doc.title}</b>.</p>
          </div>
          
          <div className="space-y-4">
            <div>
               <label className="block text-sm font-medium text-brand-700 mb-2">Verify Identity with Google</label>
               {/* Fallback custom button that triggers Google Identity prompt. The GIS script may also render its own button into this div. */}
               <button
                 type="button"
                 onClick={handleGoogleClick}
                 className="w-full bg-yellow-400 text-brand-900 py-2 rounded-md hover:bg-yellow-300 transition font-medium mb-3"
               >
                 Continue with Google
               </button>
               <div id="google-signin-button" className="flex justify-center" />
            </div>
            {authError && (
              <div className="text-red-600 text-sm bg-red-50 p-2 rounded border border-red-200">
                {authError}
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  // --- Step 3: Success View ---
  if (success) {
    return (
        <div className="min-h-screen bg-brand-50 flex items-center justify-center p-4">
            <div className="text-center">
                <div className="inline-flex items-center justify-center w-20 h-20 bg-yellow-100 rounded-full mb-6">
                    <CheckCircle size={40} className="text-yellow-500" />
                </div>
                <h1 className="text-3xl font-bold text-brand-900 mb-4">Document Signed Successfully!</h1>
                <p className="text-brand-600 mb-8">Thank you, {email}. A copy has been saved.</p>
            </div>
        </div>
    );
  }

  // --- Step 2: Signing Interface ---
  const pdfSrc = doc.fileUrl?.startsWith('data:application/pdf') ? doc.fileUrl : `data:application/pdf;base64,${doc.fileUrl || ''}`;

  return (
    <div className="min-h-screen bg-brand-50 flex flex-col">
      <header className="bg-white shadow-sm p-4 flex justify-between items-center z-10 border-b border-brand-100">
        <h1 className="text-lg font-bold truncate text-brand-900">{doc.title}</h1>
        <div className="text-sm text-brand-500">Signing as: <span className="font-medium text-brand-900">{email}</span></div>
      </header>

      <div className="flex-1 flex flex-col lg:flex-row overflow-hidden">
        {/* PDF Preview */}
        <div className="flex-1 bg-brand-300 p-4 overflow-auto flex justify-center">
            {/* Using iframe for simplicity in this demo environment. Ideally use react-pdf */}
            <iframe 
                src={`${pdfSrc}#toolbar=0&navpanes=0`} 
                className="w-full max-w-2xl h-full shadow-lg bg-white" 
                title="Document PDF"
            />
        </div>

        {/* Signing Controls */}
        <div className="w-full lg:w-96 bg-white border-l border-brand-100 p-6 flex flex-col shadow-xl z-20">
          <h3 className="text-lg font-semibold mb-6">Sign Document</h3>

          <div className="flex gap-2 mb-4">
            <button 
              onClick={() => setSigningMethod('draw')}
              className={`flex-1 py-2 text-sm font-medium rounded border ${signingMethod === 'draw' ? 'bg-brand-50 border-yellow-400 text-brand-800' : 'border-brand-200 text-brand-600'}`}
            >
              Draw
            </button>
            <button 
               onClick={() => setSigningMethod('upload')}
               className={`flex-1 py-2 text-sm font-medium rounded border ${signingMethod === 'upload' ? 'bg-brand-50 border-yellow-400 text-brand-800' : 'border-brand-200 text-brand-600'}`}
            >
              Upload
            </button>
          </div>

          <div className="flex-1 flex flex-col justify-center">
             {signingMethod === 'draw' ? (
               <div className="mb-4">
                 <div className="border-2 border-dashed border-brand-200 rounded-lg bg-brand-50 relative touch-none">
                    <canvas
                      ref={canvasRef}
                      width={300}
                      height={150}
                      className="w-full h-[150px] cursor-crosshair rounded-lg"
                      onMouseDown={startDrawing}
                      onMouseMove={draw}
                      onMouseUp={stopDrawing}
                      onMouseLeave={stopDrawing}
                      onTouchStart={startDrawing}
                      onTouchMove={draw}
                      onTouchEnd={stopDrawing}
                    />
                    <button onClick={clearCanvas} className="absolute top-2 right-2 p-1 bg-white rounded-full shadow hover:bg-brand-50" title="Clear">
                       <RefreshCw size={14} />
                    </button>
                 </div>
                 <p className="text-xs text-center mt-2 text-brand-500">Draw your signature above</p>
               </div>
             ) : (
                <div className="mb-4 border-2 border-dashed border-brand-200 rounded-lg h-[150px] flex flex-col items-center justify-center bg-brand-50">
                   <Upload className="text-brand-400 mb-2" />
                   <input type="file" accept="image/*" onChange={handleFileUpload} className="text-sm text-brand-500 ml-8" />
                </div>
             )}

             {signatureData && (
                <div className="bg-yellow-50 p-2 rounded border border-yellow-200 text-yellow-800 text-sm text-center mb-4">
                   Signature captured successfully
                </div>
             )}
          </div>

          <div className="mt-auto pt-6 border-t border-brand-100">
             <div className="flex items-center mb-4">
                <input type="checkbox" id="consent" className="h-4 w-4 text-yellow-400 rounded" defaultChecked />
                <label htmlFor="consent" className="ml-2 block text-xs text-brand-600">
                  I agree to be legally bound by this document and signature.
                </label>
             </div>
             <button
               onClick={submitSignature}
               disabled={!signatureData || submitting}
               className="w-full bg-yellow-400 text-brand-900 py-3 rounded-lg font-bold shadow-sm hover:bg-yellow-300 disabled:opacity-50 disabled:cursor-not-allowed flex justify-center items-center gap-2"
             >
                {submitting ? 'Signing...' : <><PenTool size={18} /> Sign Document</>}
             </button>
          </div>
        </div>
      </div>
    </div>
  );
}
