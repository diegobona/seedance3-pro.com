type ModelId = 'seedance-2-5' | 'minimax-h3' | 'gpt-image-2'

const content = {
  'seedance-2-5': {
    title: 'Create text-to-video clips in the Seedance 2.5 workspace',
    description: 'Enter a scene description, choose a 5, 10 or 15 second trial, and generate a 480p video. The form shows the credit cost before you submit. Sign-in and available credits are required to run a job.',
    capabilities: [
      ['Text prompts', 'Describe your subject, action, setting, camera movement and lighting in one prompt.'],
      ['Video format', 'Choose a 16:9, 9:16 or 1:1 frame and an available trial duration.'],
      ['Task status', 'Follow progress in the workspace and open the completed video.'],
    ],
    steps: [
      'Write a scene with one main action and a clear camera direction.',
      'Select duration and aspect ratio. The trial resolution is fixed at 480p.',
      'Review the credit cost, sign in, then generate and check the result.',
    ],
    questions: [
      ['What inputs can I use?', 'The current form accepts a text prompt. Reference uploads are not enabled here.'],
      ['What durations are available?', 'Choose 5, 10 or 15 seconds. Trial output resolution is 480p.'],
      ['Do I need an account?', 'Yes. Sign in and check your available credits before generation.'],
    ],
  },
  'minimax-h3': {
    title: 'Create text-to-video clips with MiniMax H3',
    description: 'This studio currently offers a text-to-video trial. Enter a scene description, choose 5, 10 or 15 seconds, and generate at 480p. The form shows the credit cost before you submit. Sign-in and available credits are required to run a job.',
    capabilities: [
      ['Text prompts', 'Describe the subject, action, setting, camera movement and lighting in one prompt.'],
      ['Video format', 'Choose a 16:9, 9:16 or 1:1 frame and one of the available trial durations.'],
      ['Task status', 'Follow the generation status in the workspace and open the completed video.'],
    ],
    steps: [
      'Write a concrete scene with one main action and a clear camera direction.',
      'Select duration and aspect ratio. The trial resolution is fixed at 480p.',
      'Review the credit cost, sign in, then generate and check the result.',
    ],
    questions: [
      ['Can I upload image, video or audio references here?', 'The current MiniMax H3 studio trial supports text prompts. Reference uploads are not enabled in this form.'],
      ['What durations are available?', 'You can choose 5, 10 or 15 seconds. The trial output resolution is 480p.'],
      ['Does generating require an account?', 'Yes. The studio asks you to sign in and checks your available credits before generation.'],
    ],
  },
  'gpt-image-2': {
    title: 'Generate and edit images with GPT Image 2',
    description: 'Create an image from a text prompt or upload a PNG, JPEG or WebP image as a reference for editing. The current trial offers 1K output, 1 to 3 images per request, and square, landscape or portrait formats. The credit cost appears before you generate.',
    capabilities: [
      ['Text to image', 'Describe the subject, composition, lighting, style and details you need in the final image.'],
      ['Reference editing', 'Upload one image and describe the change while naming the details to preserve.'],
      ['Flexible output', 'Choose 1:1, 3:2 or 2:3 and generate up to three 1K images in one request.'],
    ],
    steps: [
      'Write a prompt, or upload a reference image and describe the edit.',
      'Choose the image count and aspect ratio. The trial resolution is 1K.',
      'Review the credit cost, sign in, and generate your image.',
    ],
    questions: [
      ['Can I edit an existing image?', 'Yes. Upload one reference image and describe what to change in the prompt.'],
      ['What image sizes can I use?', 'The current trial generates 1K output in square, landscape or portrait formats.'],
      ['Can I control a character pose first?', 'Yes. Use Pose Control to arrange the pose, then send its capture to image generation.'],
    ],
  },
} as const

export function ModelLandingContent({ modelId }: { modelId: string }) {
  if (!(modelId in content)) return null
  const page = content[modelId as ModelId]
  return (
    <section className="model-landing-content" id="model-details" aria-label={`${modelId} information`}>
      <div className="model-landing-inner">
        <p className="model-landing-eyebrow">About this tool</p>
        <h2>{page.title}</h2>
        <p className="model-landing-summary">{page.description}</p>
        <div className="model-landing-grid">
          {page.capabilities.map(([title, text]) => <article key={title}><h3>{title}</h3><p>{text}</p></article>)}
        </div>
        <h2>How to use this generator</h2>
        <ol className="model-landing-steps">{page.steps.map(step => <li key={step}>{step}</li>)}</ol>
        <h2>Questions about this tool</h2>
        <div className="model-landing-faq">{page.questions.map(([question, answer]) => <details key={question}><summary>{question}</summary><p>{answer}</p></details>)}</div>
        <nav className="model-landing-links" aria-label="Explore related tools">
          <a href="/">Seedance home</a>
          <a href="/app/video/minimax-h3">MiniMax H3 video</a>
          <a href="/app/image/gpt-image-2">GPT Image 2 image</a>
          <a href="/pose-to-image">Pose Control</a>
          <a href="/showcase.html">Showcase</a>
          {modelId === 'minimax-h3' && <a href="/prompts/minimax-h3/videos">H3 Video Prompt Library</a>}
          <a href="/blog.html">Blog</a>
        </nav>
      </div>
    </section>
  )
}
