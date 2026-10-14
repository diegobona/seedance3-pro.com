export const DEFAULT_IMAGE_MODEL = 'gpt-image-2';
export const IMAGE_MODEL_HEADER = 'x-seedance-image-model';

// Website IDs are distinct from provider aliases. Only these models may be billed or sent upstream.
const imageModels = Object.freeze({
  'gpt-image-2': Object.freeze({
    name: 'GPT Image 2', providerModel: 'gpt-image-2', quality: 'medium', creditCost: 5, maxReferences: 16,
    sizes: Object.freeze({ '1:1': '1024x1024', '3:2': '1536x1024', '2:3': '1024x1536' }),
  }),
  'gpt-image-2-5-1k': Object.freeze({
    name: 'GPT Image 2.5', providerModel: 'gpt-image-2.5-1k', quality: 'low', creditCost: 5, maxReferences: 4,
    sizes: Object.freeze({
      '1:1': '1254x1254', '3:2': '1536x1024', '2:3': '1024x1536',
      '3:4': '1086x1448', '4:3': '1448x1086', '4:5': '1122x1402', '5:4': '1402x1122',
      '16:9': '1672x941', '9:16': '941x1672', '21:9': '1915x821', '9:21': '821x1915',
    }),
  }),
});

export function getImageModel(modelId = DEFAULT_IMAGE_MODEL) {
  return Object.hasOwn(imageModels, modelId) ? imageModels[modelId] : null;
}

export function imageSizeForAspectRatio(aspectRatio, modelId = DEFAULT_IMAGE_MODEL) {
  const model = getImageModel(modelId);
  return model?.sizes[aspectRatio] || model?.sizes['1:1'];
}
