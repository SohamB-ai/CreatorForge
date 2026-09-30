import { Check, Copy, LoaderCircle, Save } from 'lucide-react';

export default function ChatMessageActions({ saved, saving, disabled, onSave, onCopy }) {
  return <>
    <button className="icon-button" aria-label="Copy response" title="Copy response" onClick={onCopy}><Copy size={14} /></button>
    <button className="icon-button" aria-label={saved ? 'Response saved to library' : 'Save response to library'} title={saved ? 'Saved in the source library' : 'Save to the source library for editing and export'} disabled={saved || disabled} onClick={onSave}>{saving ? <LoaderCircle className="spin" size={14} /> : saved ? <Check size={14} /> : <Save size={14} />}</button>
  </>;
}
