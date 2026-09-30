import { Check, Copy, LoaderCircle, Save } from 'lucide-react';

export default function ChatMessageActions({ saved, saving, disabled, onSave, onCopy }) {
  return <>
    <button className="icon-button" aria-label="Copy response" title="Copy response" onClick={onCopy}><Copy size={16} /></button>
    <button className="icon-button" aria-label={saved ? 'Response saved to library' : 'Save response to library'} title={saved ? 'Saved in the source library' : 'Save to the source library for editing and export'} disabled={saved || disabled} onClick={onSave}>{saving ? <LoaderCircle className="spin" size={16} /> : saved ? <Check size={16} /> : <Save size={16} />}</button>
  </>;
}
