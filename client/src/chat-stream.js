const streamError = (error) => Object.assign(new Error(error), { response: { data: { error } } });

export async function readChatStream(body, { signal, onDelta }) {
  const reader = body.getReader();
  const decoder = new TextDecoder('utf-8', { fatal: true });
  let rejectAbort;
  const aborted = new Promise((resolve, reject) => { rejectAbort = reject; });
  const abort = () => {
    rejectAbort(signal.reason || new DOMException('Generation cancelled.', 'AbortError'));
    reader.cancel().catch(() => {});
  };
  signal?.addEventListener('abort', abort, { once: true });
  let buffer = '';
  let content = '';
  try {
    while (true) {
      signal?.throwIfAborted();
      const chunk = await Promise.race([reader.read(), aborted]);
      signal?.throwIfAborted();
      buffer += decoder.decode(chunk.value, { stream: !chunk.done });
      if (buffer.length > 256000) throw streamError('The response stream is too large. Try a shorter request.');
      let boundary;
      while ((boundary = /\r?\n\r?\n/.exec(buffer))) {
        const frame = buffer.slice(0, boundary.index);
        buffer = buffer.slice(boundary.index + boundary[0].length);
        let event = '';
        const data = [];
        for (const line of frame.split(/\r?\n/)) {
          if (line.startsWith('event:')) event = line.slice(6).trim();
          if (line.startsWith('data:')) data.push(line.slice(5).replace(/^ /, ''));
        }
        if (!data.length) continue;
        let value;
        try { value = JSON.parse(data.join('\n')); } catch { throw streamError('The server returned an invalid response stream. Please try again.'); }
        if (!value || typeof value !== 'object') throw streamError('The server returned an invalid response stream. Please try again.');
        if (event === 'error') throw streamError(typeof value.error === 'string' ? value.error : 'Generation could not complete. Please try again.');
        if (event === 'delta') {
          if (typeof value.text !== 'string') throw streamError('The server returned an invalid response stream. Please try again.');
          content += value.text;
          if (new TextEncoder().encode(content).length > 60000) throw streamError('The response exceeds the 60,000-byte limit. Try a shorter request.');
          onDelta(content);
        } else if (event === 'done') {
          if (!content.trim() || value.assistantMessage?.content !== content || !value.assistantMessage._id || value.assistantMessage.role !== 'model' || !value.userMessage?._id || value.userMessage.role !== 'user') throw streamError('The server could not confirm the saved response. Reload your chat before retrying.');
          signal?.throwIfAborted();
          return value;
        } else throw streamError('The server returned an invalid response stream. Please try again.');
      }
      if (chunk.done) throw streamError('The connection ended before generation was confirmed. Reload your chat before retrying.');
    }
  } finally {
    signal?.removeEventListener('abort', abort);
    reader.cancel().catch(() => {});
    reader.releaseLock();
  }
}
