export const skillCatalog = [
  {
    id: 'social-caption', title: 'Instagram / TikTok caption', professions: ['creator'],
    description: 'Turn a video or voice memo and thumbnails into ready-to-copy captions.',
    inputs: 'Video or audio + optional thumbnails', sourceTypes: ['video', 'audio'],
    agent: { id: 'caption-writer', name: 'Caption Writer', instruction: 'Write Instagram or TikTok captions grounded in the uploaded video or audio and reference images. Preserve the creator’s intent. Offer a concise hook and caption; do not claim to publish it.' },
    prompt: 'Write three Instagram or TikTok caption options from my uploaded video or voice memo. Use the thumbnails as visual references.',
  },
  {
    id: 'audio-blog', title: 'Audio → Blog post', professions: ['creator', 'marketer'],
    description: 'Shape a voice rant or interview into an editable, on-brand article.',
    inputs: 'Voice memo or interview audio + optional brief', sourceTypes: ['audio'],
    agent: { id: 'audio-blog-editor', name: 'Audio Blog Editor', instruction: 'Turn the uploaded audio into a coherent Markdown blog post. Preserve the speaker’s meaning, distinguish quotes from paraphrases, use any supplied campaign brief and saved brand guidelines, and never invent quotes or claims.' },
    prompt: 'Turn the uploaded voice memo or interview into a clear blog post. Follow my brand kit and use the campaign brief if one is attached.',
  },
  {
    id: 'tweet-thread', title: 'Voice / notes → Tweet thread', professions: ['creator'],
    description: 'Remix a voice rant or notes into a focused thread.',
    inputs: 'Audio or text notes', sourceTypes: ['audio', 'text'],
    agent: { id: 'thread-editor', name: 'Thread Editor', instruction: 'Remix the supplied audio or notes into a numbered tweet thread with a clear opening and logical progression. Preserve factual meaning and brand voice. Produce copy only; do not claim to post it.' },
    prompt: 'Remix my voice rant or notes into a numbered tweet thread with a strong opening and a clear takeaway.',
  },
  {
    id: 'brief-questions', title: 'Ask your campaign brief', professions: ['marketer'],
    description: 'Ask focused questions instead of rereading a long PDF.',
    inputs: 'Brief PDF', sourceTypes: ['document'],
    agent: { id: 'brief-analyst', name: 'Brief Analyst', instruction: 'Answer questions from the uploaded campaign brief. Distinguish source facts from inference, identify missing information, and do not invent page numbers or unsupported citations. Apply saved brand guidelines where relevant.' },
    prompt: 'Read my campaign brief and summarize its audience, objectives, deliverables, constraints, and unanswered questions.',
  },
  {
    id: 'visual-style', title: 'Describe a visual style', professions: ['designer'],
    description: 'Find the visual language in screenshots, sketches, and references.',
    inputs: 'Screenshot, sketch, or reference image', sourceTypes: ['image'],
    agent: { id: 'visual-style-analyst', name: 'Visual Style Analyst', instruction: 'Describe observable visual characteristics in the attached images: color, typography where legible, composition, texture, and mood. Separate observation from interpretation. Do not invent unseen details or claim to render a design.' },
    prompt: 'Describe the visual style of my screenshots and sketches. Break it down into palette, typography, composition, texture, and mood.',
  },
  {
    id: 'creative-brief', title: 'Build a structured creative brief', professions: ['designer'],
    description: 'Consolidate messy screenshots, sketches, and voice notes.',
    inputs: 'Images, voice notes, documents, or text', sourceTypes: ['image', 'audio', 'document', 'text'],
    agent: { id: 'creative-brief-builder', name: 'Creative Brief Builder', instruction: 'Consolidate all supplied references into a structured creative brief: goal, audience, message, visual direction, deliverables, constraints, and open questions. Reconcile conflicts explicitly rather than inventing resolutions.' },
    prompt: 'Consolidate my screenshots, sketches, voice notes, and other references into a structured creative brief. Flag conflicting or missing information.',
  },
  {
    id: 'image-prompt', title: 'Text brief → Image prompt', professions: ['designer'],
    description: 'Translate a written brief into a detailed image-generation prompt.',
    inputs: 'Written brief or text source', sourceTypes: [],
    agent: { id: 'image-prompt-writer', name: 'Image Prompt Writer', instruction: 'Translate the provided written brief into an image-generation prompt describing subject, composition, palette, lighting, style, and exclusions. Output a text prompt only, not a rendered image. Ask for the brief if insufficient detail is available.' },
    prompt: 'Create a detailed image-generation prompt from my written brief. Include composition, palette, lighting, style, and exclusions. Return text only.',
  },
];

export const skillsForProfessions = professions => skillCatalog.filter(skill => skill.professions.some(profession => professions.includes(profession)));
export const skillById = identifier => skillCatalog.find(skill => skill.id === identifier);
