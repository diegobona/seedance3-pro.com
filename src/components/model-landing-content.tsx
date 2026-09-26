type ModelId = 'seedance-2-5' | 'minimax-h3' | 'gpt-image-2'

const content = {
  'seedance-2-5': {
    title: 'Create text-to-video clips in the Seedance 2.5 workspace',
    description: 'Enter a scene description and choose from the video settings available in the workspace. Review the credit cost before submitting. Sign-in and available credits are required to generate.',
    capabilities: [
      ['Text prompts', 'Describe your subject, action, setting, camera movement and lighting in one prompt.'],
      ['Video format', 'Choose the duration and frame format available for your scene.'],
      ['Task status', 'Follow progress in the workspace and open the completed video.'],
    ],
    steps: [
      'Write a scene with one main action and a clear camera direction.',
      'Choose your duration and aspect ratio, and review the available resolution in the form.',
      'Review the credit cost, sign in, then generate and check the result.',
    ],
    questions: [
      ['What inputs can I use?', 'The current form accepts a text prompt. Reference uploads are not enabled here.'],
      ['What durations are available?', 'The duration and resolution controls show the options currently available in the workspace.'],
      ['Do I need an account?', 'Yes. Sign in and check your available credits before generation.'],
    ],
  },
  'minimax-h3': {
    title: 'MiniMax H3 text-to-video and image-to-video',
    description: 'Describe a new scene from scratch, or use reference images to guide the people, objects and setting. Add an action and camera direction to turn the idea into a short video.',
    capabilities: [
      ['Text to video', 'Describe the subject, action, setting, camera movement and lighting. No reference image is needed.'],
      ['Image to video', 'Upload reference images and describe their roles by image number. The upload area shows the current file requirements.'],
      ['Video format', 'Choose your duration and aspect ratio from the options available for the selected generation mode.'],
      ['Task status', 'Follow the generation status in the workspace and open the completed video.'],
    ],
    steps: [
      'Choose Text to video, or select Reference to video and upload your images.',
      'Describe one main action and the camera movement. With multiple images, identify each subject or setting by its image number.',
      'Choose your duration and aspect ratio, and review the available resolution in the form.',
      'Review the credit cost, sign in, then generate and check the result.',
    ],
    questions: [
      ['Can MiniMax H3 generate a video from a single image?', 'Yes. Select Reference to video, upload one image, and describe the action and camera movement you want. You can also add more reference images to guide the scene.'],
      ['How do I use multiple reference images?', 'Select Reference to video and add your images within the limits shown in the upload area. Images are numbered in upload order. For example: use Image 1 as the setting and animate the character from Image 2 walking through it.'],
      ['What video lengths and formats are available here?', 'The form shows the available duration, resolution and aspect ratio for your selected mode. Check these controls when setting up your video.'],
      ['How many credits does a video cost?', 'The form shows the credit cost for your selected settings and your available balance before submission. Sign in to generate.'],
      ['Can I reuse an example prompt?', 'Yes. Select Try it beside a video example to fill the prompt field, then adjust it before generating. The MiniMax H3 Prompt Library includes more original videos and their exact prompts.'],
    ],
  },
  'gpt-image-2': {
    title: 'GPT Image 2 text-to-image and reference editing',
    description: 'Turn a written idea into an image, revise an existing picture, or combine references for the subject, setting and visual style. Explain what to change and which details to keep.',
    capabilities: [
      ['Text to image', 'Describe the subject, composition, lighting, style and details you need in the final image.'],
      ['Reference editing', 'Add reference images and identify their roles by image number. Describe the changes and the details you want to preserve.'],
      ['Flexible output', 'Choose from the image count, resolution and aspect ratio options available in the form.'],
    ],
    steps: [
      'Start with a text prompt, or upload the images you want to use as references.',
      'Describe the subject, setting and style. For reference editing, name each image by its displayed number and explain what to change or preserve.',
      'Choose the image count and aspect ratio, and review the available resolution in the form.',
      'Review the credit cost, sign in, and generate your image.',
    ],
    questions: [
      ['Can I generate an image without uploading a reference?', 'Yes. Enter a text prompt describing the subject, composition, lighting and style, then choose your output settings. Reference images are optional.'],
      ['How do I use multiple reference images?', 'Add your references within the limits shown in the upload area. Refer to their displayed image numbers in your prompt. For example, use the subject from Image 1 in the setting from Image 2, and describe how they should fit together.'],
      ['Can I edit an existing image?', 'Yes. Upload the image and describe the changes, such as a different background, outfit or visual style. Specify the details to keep, then review the result before using it.'],
      ['What image sizes can I use?', 'The resolution and aspect ratio controls show the output options currently available in the workspace.'],
      ['Can I control a character pose first?', 'Yes. Use Pose Control to arrange the pose, then send its capture to image generation.'],
      ['Where can I find prompts to try?', 'Select Try it beside an image example to fill the prompt field, or browse the GPT Image 2 Prompt Library for original images and their exact prompts. Adjust the prompt to suit your idea before generating.'],
      ['Do I need an account or credits?', 'Sign in to generate. The form shows the credit cost for your selected settings and your available balance before submission.'],
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
          {modelId === 'minimax-h3' && <a href="/minimax-h3-prompts">MiniMax H3 Prompt Library</a>}
          {modelId === 'gpt-image-2' && <a href="/gpt-image-2-prompts">GPT Image 2 Prompt Library</a>}
          <a href="/blog.html">Blog</a>
        </nav>
      </div>
    </section>
  )
}
