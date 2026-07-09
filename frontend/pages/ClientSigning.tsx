
import React, { useState, useEffect, useRef } from 'react';
import { useParams, useSearchParams } from 'react-router-dom';
import { DocumentData, DocumentStatus } from '../types';
import { DocumentsAPI } from '../services/api';
import { COMPANY_NAME } from '../constants';
import { PenTool, Upload, RefreshCw, CheckCircle, Lock, Download, FileText, Loader2 } from 'lucide-react';
import LoadingScreen from '../components/ui/LoadingScreen';

export default function ClientSigning() {
  const { token: docId } = useParams<{ token: string }>();
  const [searchParams] = useSearchParams();
  const signToken = searchParams.get('token') || '';
  const [doc, setDoc] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  
  const [email, setEmail] = useState('');
  const [authenticated, setAuthenticated] = useState(false);
  const [authError, setAuthError] = useState('');

  const [signingMethod, setSigningMethod] = useState<'draw' | 'upload'>('draw');
  const [signatureData, setSignatureData] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const isDrawing = useRef(false);

  const buildSignedPdfHref = (signedPdfUrl?: string) => {
    if (!signedPdfUrl) return undefined;
    const value = String(signedPdfUrl);
    if (value.startsWith('data:application/pdf')) return value;
    return `data:application/pdf;base64,${value}`;
  };

  useEffect(() => {
    const load = async () => {
      try {
        if (!docId || !signToken) {
          setError('Invalid Document Link');
          setLoading(false);
          return;
        }
        const resp = await DocumentsAPI.getPublic(docId, signToken);
        setDoc({ ...resp.document, _id: docId, signToken });
      } catch {
        setError('Invalid Document Link');
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [docId, signToken]);
  
  const handleGoogleClick = () => {
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

  useEffect(() => {
    const handler = (event: MessageEvent) => {
      const apiBase = (import.meta as any).env?.VITE_API_URL || 'http://localhost:5000/api';
      try {
        const apiOrigin = new URL(apiBase).origin;
        if (event.origin !== apiOrigin) return;
      } catch { /* ignore */ }

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
  }, []);

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
    ctx.lineWidth = 2.5;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.strokeStyle = '#171717';
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
        const MAX_W = 600, MAX_H = 200;
        let w = img.width, h = img.height;
        const ratio = Math.min(MAX_W / w, MAX_H / h, 1);
        w = Math.max(1, Math.round(w * ratio));
        h = Math.max(1, Math.round(h * ratio));
        const c = document.createElement('canvas');
        c.width = MAX_W; c.height = MAX_H;
        const ctx = c.getContext('2d');
        if (!ctx) return;
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, c.width, c.height);
        ctx.drawImage(img, Math.round((MAX_W - w) / 2), Math.round((MAX_H - h) / 2), w, h);
        setSignatureData(c.toDataURL('image/png'));
      };
      img.src = reader.result as string;
    };
    reader.readAsDataURL(file);
  };

  const submitSignature = async () => {
    if (!doc || !signatureData) return;
    setSubmitting(true);
    try {
      await DocumentsAPI.sign(doc._id || doc.id, { 
        dataUrl: signatureData, 
        token: doc.signToken,
        signerEmail: email
      });
      setSuccess(true);
    } catch (err) {
      console.error(err);
      alert('Failed to sign document');
    } finally {
      setSubmitting(false);
    }
  };

  const StepIndicator = ({ step }: { step: 1 | 2 | 3 }) => (
    <div className="flex items-center justify-center gap-0 mb-8">
      {[
        { n: 1, label: 'Verify' },
        { n: 2, label: 'Review & Sign' },
        { n: 3, label: 'Done' },
      ].map((s, i) => (
        <React.Fragment key={s.n}>
          <div className="flex flex-col items-center gap-1">
            <div className={`step-dot ${step > s.n ? 'step-dot-done' : step === s.n ? 'step-dot-active' : 'step-dot-inactive'}`}>
              {step > s.n ? <CheckCircle size={14} /> : s.n}
            </div>
            <span className={`text-[10px] font-medium ${step >= s.n ? 'text-brand-700' : 'text-brand-400'}`}>{s.label}</span>
          </div>
          {i < 2 && <div className={`step-line ${step > s.n ? 'step-line-done' : ''}`} />}
        </React.Fragment>
      ))}
    </div>
  );

  if (loading) return <LoadingScreen message="Loading secure document..." />;

  if (error || !doc) {
    return (
      <div className="min-h-screen bg-brand-50 flex items-center justify-center p-4">
        <div className="card max-w-md w-full text-center animate-slideUp">
          <div className="card-body py-10">
            <div className="w-14 h-14 rounded-2xl bg-red-50 flex items-center justify-center mx-auto mb-4">
              <FileText size={24} className="text-red-500" />
            </div>
            <h2 className="text-xl font-bold text-brand-900 mb-2">Document Not Found</h2>
            <p className="text-sm text-brand-500">{error || 'This link may be expired or invalid.'}</p>
          </div>
        </div>
      </div>
    );
  }

  if (doc.status === DocumentStatus.SIGNED && !success) {
    return (
      <div className="min-h-screen bg-brand-50 flex items-center justify-center p-4">
        <div className="card max-w-md w-full text-center animate-slideUp">
          <div className="card-body py-10">
            <div className="w-16 h-16 rounded-full bg-yellow-50 flex items-center justify-center mx-auto mb-5">
              <CheckCircle size={32} className="text-yellow-500" />
            </div>
            <h2 className="text-2xl font-bold text-brand-900 mb-2">Already Signed</h2>
            <p className="text-sm text-brand-500 mb-6">
              Signed on {new Date(doc.signedAt!).toLocaleString()}
            </p>
            {doc.signedPdfUrl && (
              <a href={buildSignedPdfHref(doc.signedPdfUrl)} download="signed_document.pdf" className="btn btn-primary">
                <Download size={16} /> Download Copy
              </a>
            )}
          </div>
        </div>
      </div>
    );
  }

  if (!authenticated) {
    return (
      <div className="min-h-screen bg-brand-50 flex flex-col items-center justify-center p-4">
        <div className="w-full max-w-md animate-fadeIn">
          <StepIndicator step={1} />
          <div className="card">
            <div className="card-body py-8">
              <div className="text-center mb-6">
                <div className="w-12 h-12 rounded-xl bg-yellow-50 flex items-center justify-center mx-auto mb-4">
                  <Lock size={22} className="text-yellow-500" />
                </div>
                <h2 className="text-xl font-bold text-brand-900">Verify Your Identity</h2>
                <p className="text-sm text-brand-500 mt-2 leading-relaxed">
                  <span className="font-medium text-brand-700">{COMPANY_NAME}</span> invited you to sign
                </p>
                <p className="text-sm font-semibold text-brand-900 mt-1">{doc.title}</p>
              </div>
              
              <button type="button" onClick={handleGoogleClick} className="btn btn-primary btn-lg w-full">
                <svg className="w-5 h-5" viewBox="0 0 24 24"><path fill="currentColor" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z"/><path fill="currentColor" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/><path fill="currentColor" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/><path fill="currentColor" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/></svg>
                Continue with Google
              </button>
              <div id="google-signin-button" className="flex justify-center mt-3" />

              {authError && (
                <div className="mt-4 text-red-700 text-sm bg-red-50 px-3 py-2.5 rounded-lg border border-red-200 animate-fadeIn">
                  {authError}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (success) {
    return (
      <div className="min-h-screen bg-brand-50 flex flex-col items-center justify-center p-4">
        <div className="w-full max-w-md text-center animate-slideUp">
          <StepIndicator step={3} />
          <div className="inline-flex items-center justify-center w-20 h-20 bg-yellow-100 rounded-full mb-6">
            <CheckCircle size={40} className="text-yellow-500" />
          </div>
          <h1 className="text-3xl font-bold text-brand-900 mb-3">All Done!</h1>
          <p className="text-brand-500 mb-2">Document signed successfully.</p>
          <p className="text-sm text-brand-400">Thank you, {email}</p>
        </div>
      </div>
    );
  }

  const pdfSrc = doc.fileUrl?.startsWith('data:application/pdf') ? doc.fileUrl : `data:application/pdf;base64,${doc.fileUrl || ''}`;

  return (
    <div className="min-h-screen bg-brand-50 flex flex-col">
      <header className="bg-white border-b border-brand-100 px-4 md:px-6 py-3 flex justify-between items-center sticky top-0 z-10 shadow-sm">
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="w-8 h-8 rounded-lg bg-yellow-400 flex items-center justify-center shrink-0">
            <PenTool size={14} className="text-brand-900" />
          </div>
          <h1 className="text-base font-semibold truncate text-brand-900">{doc.title}</h1>
        </div>
        <div className="text-xs text-brand-500 shrink-0 ml-3">
          Signing as <span className="font-medium text-brand-800">{email}</span>
        </div>
      </header>

      <div className="px-4 py-4 max-w-5xl mx-auto w-full">
        <StepIndicator step={2} />
      </div>

      <div className="flex-1 flex flex-col lg:flex-row overflow-hidden max-w-6xl mx-auto w-full px-4 pb-4 gap-4">
        <div className="flex-1 bg-brand-200/50 rounded-xl p-3 md:p-4 overflow-auto flex justify-center min-h-[300px] lg:min-h-0">
          <iframe 
            src={`${pdfSrc}#toolbar=0&navpanes=0`} 
            className="w-full max-w-2xl h-full min-h-[400px] shadow-lg bg-white rounded-lg" 
            title="Document PDF"
          />
        </div>

        <div className="w-full lg:w-[22rem] card flex flex-col shrink-0">
          <div className="card-body flex flex-col flex-1">
            <h3 className="text-base font-semibold text-brand-900 mb-4">Your Signature</h3>

            <div className="flex gap-1.5 p-1 bg-brand-50 rounded-lg mb-4">
              {(['draw', 'upload'] as const).map((method) => (
                <button 
                  key={method}
                  onClick={() => setSigningMethod(method)}
                  className={`flex-1 py-2 text-sm font-medium rounded-md transition-all ${
                    signingMethod === method
                      ? 'bg-white text-brand-900 shadow-sm'
                      : 'text-brand-500 hover:text-brand-700'
                  }`}
                >
                  {method === 'draw' ? 'Draw' : 'Upload'}
                </button>
              ))}
            </div>

            <div className="flex-1 flex flex-col justify-center">
              {signingMethod === 'draw' ? (
                <div className="mb-3">
                  <div className="border-2 border-dashed border-brand-200 rounded-xl bg-white relative touch-none overflow-hidden">
                    <canvas
                      ref={canvasRef}
                      width={300}
                      height={150}
                      className="w-full h-[150px] cursor-crosshair"
                      onMouseDown={startDrawing}
                      onMouseMove={draw}
                      onMouseUp={stopDrawing}
                      onMouseLeave={stopDrawing}
                      onTouchStart={startDrawing}
                      onTouchMove={draw}
                      onTouchEnd={stopDrawing}
                    />
                    <button onClick={clearCanvas} className="absolute top-2 right-2 p-1.5 bg-white rounded-full shadow-sm hover:bg-brand-50 border border-brand-100" title="Clear">
                      <RefreshCw size={13} />
                    </button>
                  </div>
                  <p className="text-xs text-center mt-2 text-brand-400">Draw your signature above</p>
                </div>
              ) : (
                <label className="mb-3 border-2 border-dashed border-brand-200 rounded-xl h-[150px] flex flex-col items-center justify-center bg-white cursor-pointer hover:border-yellow-400 hover:bg-yellow-50/30 transition-colors">
                  <Upload className="text-brand-400 mb-2" size={24} />
                  <span className="text-sm text-brand-500">Click to upload image</span>
                  <input type="file" accept="image/*" onChange={handleFileUpload} className="hidden" />
                </label>
              )}

              {signatureData && (
                <div className="bg-green-50 px-3 py-2 rounded-lg border border-green-200 text-green-700 text-xs text-center mb-3 flex items-center justify-center gap-1.5">
                  <CheckCircle size={14} /> Signature captured
                </div>
              )}
            </div>

            <div className="pt-4 border-t border-brand-100 mt-auto">
              <label className="flex items-start gap-2.5 mb-4 cursor-pointer">
                <input type="checkbox" id="consent" className="h-4 w-4 mt-0.5 rounded border-brand-300 text-yellow-400 focus:ring-yellow-400" defaultChecked />
                <span className="text-xs text-brand-500 leading-relaxed">
                  I agree to be legally bound by this document and my electronic signature.
                </span>
              </label>
              <button
                onClick={submitSignature}
                disabled={!signatureData || submitting}
                className="btn btn-primary btn-lg w-full"
              >
                {submitting ? <><Loader2 size={18} className="animate-spin" /> Signing...</> : <><PenTool size={18} /> Sign Document</>}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
