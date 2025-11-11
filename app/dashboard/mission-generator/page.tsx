'use client'

import { useEffect, useRef, useState } from 'react'
import { Wand2, Download, Plus, Trash2 } from 'lucide-react'

const STORAGE_KEY = 'mission-generator-form'

const createEmptyBlock = () => ({
  image: '',
  alt: '',
  description: ''
})

const createEmptyMcq = () => ({
  compalsary: null as boolean | null,
  question: '',
  options: ['', '', '', ''],
  correctAnswer: 0,
  feedback: { success: '', retry: '' }
})

const createEmptyStep = () => ({
  title: '',
  points: 0,
  instruction: '',
  note: '',
  image: '',
  hint: '',
  important: '',
  blocks: [createEmptyBlock()],
  tryThis: '',
  whyItWorks: '',
  mcq: createEmptyMcq()
})

const createDefaultFormData = () => ({
    version: 1,
    layout: 'BlocklySplitLayout',
    title: '',
    description: '',
    mission_time: '',
    Difficulty: 1,
    missionPageImage: '',
    intro: {
      image: '',
      timeAllocated: '',
      description: ''
    },
    learn_before_you_code: [{ topic: '', explanation: '' }],
    requirements: [''],
    blocks_used: [''],
  steps: [createEmptyStep()],
    mission_reference_code: '',
    report_card: [{ task: '', points: 0 }],
    total_points: 0,
    learning_outcomes: [''],
    resources: [{ type: 'image', path: '' }]
  })

type FormDataState = ReturnType<typeof createDefaultFormData>

const sanitizeFileName = (name: string) =>
  name
    .trim()
    .toLowerCase()
    .replace(/\s+/g, '-')
    .replace(/[^a-z0-9._-]/g, '')
    || 'asset'

interface ImageDropZoneProps {
  title: string
  path: string
  previewUrl?: string
  file?: File
  onSelect: (file: File) => void
  onRemove?: () => void
}

function ImageDropZone({ title, path, previewUrl, file, onSelect, onRemove }: ImageDropZoneProps) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [resolvedPreview, setResolvedPreview] = useState<string | null>(null)

  useEffect(() => {
    if (previewUrl) {
      setResolvedPreview(previewUrl)
      return
    }

    if (file) {
      const url = URL.createObjectURL(file)
      setResolvedPreview(url)
      return () => URL.revokeObjectURL(url)
    }

    if (
      typeof path === 'string' &&
      (path.startsWith('http://') || path.startsWith('https://') || path.startsWith('data:') || path.startsWith('blob:'))
    ) {
      setResolvedPreview(path)
    } else {
      setResolvedPreview(null)
    }

    return undefined
  }, [previewUrl, file, path])

  const openFilePicker = () => {
    inputRef.current?.click()
  }

  const handleFileSelection = (file?: File | null) => {
    if (file) {
      onSelect(file)
    }
  }

  return (
    <div
      onDragOver={(event) => {
        event.preventDefault()
        event.dataTransfer.dropEffect = 'copy'
      }}
      onDrop={(event) => {
        event.preventDefault()
        const file = event.dataTransfer.files?.[0]
        handleFileSelection(file)
      }}
      className="w-full rounded-md border-2 border-dashed border-gray-300 bg-gray-50 px-3 py-4 text-center text-sm text-gray-600 transition hover:border-blue-400 hover:bg-blue-50"
    >
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(event) => {
          const file = event.target.files?.[0]
          handleFileSelection(file)
          if (event.target) {
            event.target.value = ''
          }
        }}
      />

      {path ? (
        <div className="space-y-2">
          {resolvedPreview ? (
            <img
              src={resolvedPreview}
              alt={title}
              className="mx-auto max-h-32 rounded border object-contain"
            />
          ) : (
            <p className="text-xs text-gray-500">Preview unavailable</p>
          )}
          <p className="font-medium text-gray-800 break-all">{path}</p>
          <div className="flex justify-center gap-2">
            <button
              type="button"
              onClick={openFilePicker}
              className="inline-flex items-center gap-2 rounded-md border border-gray-300 bg-white px-3 py-2 text-xs font-medium text-gray-700 hover:bg-gray-100"
            >
              Change image
            </button>
            {onRemove && (
              <button
                type="button"
                onClick={onRemove}
                className="inline-flex items-center gap-2 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-xs font-medium text-red-600 hover:bg-red-100"
              >
                Remove
              </button>
            )}
          </div>
        </div>
      ) : (
        <div className="space-y-2">
          <p className="font-medium text-gray-800">{title}</p>
          <p>Drag & drop an image here, or click to browse</p>
          <button
            type="button"
            onClick={openFilePicker}
            className="inline-flex items-center gap-2 rounded-md border border-gray-300 bg-white px-3 py-2 text-xs font-medium text-gray-700 hover:bg-gray-100"
          >
            Browse files
          </button>
        </div>
      )}
    </div>
  )
}

const normalizeFormData = (raw: any): FormDataState => {
  const defaults = createDefaultFormData()

  const normalizeSteps = (steps: any): FormDataState['steps'] => {
    if (!Array.isArray(steps) || steps.length === 0) return defaults.steps
    return steps.map((step: any) => {
      const baseStep = createEmptyStep()
      return {
        ...baseStep,
        ...step,
        blocks:
          Array.isArray(step?.blocks) && step.blocks.length > 0
            ? step.blocks.map((block: any) => ({
                image: block?.image || '',
                alt: block?.alt || '',
                description: block?.description || ''
              }))
            : baseStep.blocks,
        mcq: {
          compalsary: (() => {
            const value = step?.mcq?.compalsary
            if (typeof value === 'boolean') return value
            if (typeof value === 'string') {
              const lowered = value.toLowerCase()
              if (lowered === 'true') return true
              if (lowered === 'false') return false
            }
            return null
          })(),
          question: step?.mcq?.question ?? '',
          options:
            Array.isArray(step?.mcq?.options) && step.mcq.options.length === 4
              ? step.mcq.options
              : baseStep.mcq.options,
          correctAnswer:
            typeof step?.mcq?.correctAnswer === 'number'
              ? step.mcq.correctAnswer
              : baseStep.mcq.correctAnswer,
          feedback: {
            success: step?.mcq?.feedback?.success ?? '',
            retry: step?.mcq?.feedback?.retry ?? ''
          }
        }
      }
    })
  }

  return {
    ...defaults,
    ...raw,
    intro: {
      ...defaults.intro,
      ...(raw?.intro || {})
    },
    learn_before_you_code: Array.isArray(raw?.learn_before_you_code) && raw.learn_before_you_code.length
      ? raw.learn_before_you_code.map((item: any) => ({
          topic: item?.topic ?? '',
          explanation: item?.explanation ?? ''
        }))
      : defaults.learn_before_you_code,
    requirements: Array.isArray(raw?.requirements) && raw.requirements.length
      ? raw.requirements
      : defaults.requirements,
    blocks_used: Array.isArray(raw?.blocks_used) && raw.blocks_used.length
      ? raw.blocks_used
      : defaults.blocks_used,
    steps: normalizeSteps(raw?.steps),
    report_card: Array.isArray(raw?.report_card) && raw.report_card.length
      ? raw.report_card.map((item: any) => ({
          task: item?.task ?? '',
          points: typeof item?.points === 'number' ? item.points : 0
        }))
      : defaults.report_card,
    learning_outcomes: Array.isArray(raw?.learning_outcomes) && raw.learning_outcomes.length
      ? raw.learning_outcomes
      : defaults.learning_outcomes,
    resources: Array.isArray(raw?.resources) && raw.resources.length
      ? raw.resources.map((resource: any) => ({
          type: resource?.type ?? 'image',
          path: resource?.path ?? ''
        }))
      : defaults.resources
  }
}

export default function MissionGeneratorPage() {
  const [jsonOutput, setJsonOutput] = useState('')
  const [formData, setFormData] = useState<FormDataState>(() => {
    if (typeof window === 'undefined') {
      return createDefaultFormData()
    }

    try {
      const stored = window.localStorage.getItem(STORAGE_KEY)
      if (stored) {
        const parsed = JSON.parse(stored)
        return normalizeFormData(parsed)
      }
    } catch (_err) {
      // Ignore parse errors and fall back to defaults
    }
    return createDefaultFormData()
  })

  useEffect(() => {
    if (typeof window === 'undefined') return
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(formData))
    } catch (_err) {
      // Ignore storage errors (e.g., quota exceeded)
    }
  }, [formData])

  const [assetFiles, setAssetFiles] = useState<Record<string, File>>({})
  const [assetPreviews, setAssetPreviews] = useState<Record<string, string>>({})

  const assignAssetPath = (file: File, previousPath?: string) => {
    if (!file) return previousPath || ''

    const sanitizedName = sanitizeFileName(file.name)
    const lastDot = sanitizedName.lastIndexOf('.')
    const baseName = lastDot !== -1 ? sanitizedName.slice(0, lastDot) : sanitizedName
    const extension = lastDot !== -1 ? sanitizedName.slice(lastDot) : ''

    let assignedPath = previousPath || ''
    setAssetFiles((prev) => {
      const nextEntries = previousPath
        ? Object.entries(prev).filter(([path]) => path !== previousPath)
        : Object.entries(prev)
      const next: Record<string, File> = Object.fromEntries(nextEntries)

      let candidate = `assets/${sanitizedName}`
      let counter = 1
      while (Object.prototype.hasOwnProperty.call(next, candidate)) {
        candidate = `assets/${baseName}-${counter}${extension}`
        counter += 1
      }

      const blobUrl = URL.createObjectURL(file)

      if (previousPath) {
        setAssetPreviews((prev) => {
          if (prev[previousPath]) {
            URL.revokeObjectURL(prev[previousPath])
          }
          const updated = { ...prev }
          delete updated[previousPath]
          return updated
        })
      }

      setAssetPreviews((prev) => ({
        ...prev,
        [candidate]: blobUrl
      }))

      next[candidate] = file
      assignedPath = candidate
      return next
    })

    return assignedPath
  }

  const removeAssetPath = (path?: string) => {
    if (!path) return
    setAssetFiles((prev) => {
      if (!Object.prototype.hasOwnProperty.call(prev, path)) {
        return prev
      }
      const next = { ...prev }
      delete next[path]
      return next
    })
    setAssetPreviews((prev) => {
      if (!prev[path]) {
        return prev
      }
      URL.revokeObjectURL(prev[path])
      const next = { ...prev }
      delete next[path]
      return next
    })
  }

  const generateJSON = () => {
    const json = JSON.stringify(formData, null, 2)
    setJsonOutput(json)
  }

  const downloadJSON = () => {
    const blob = new Blob([jsonOutput], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `${formData.title.replace(/\s+/g, '_')}_mission.json`
    a.click()
    URL.revokeObjectURL(url)
  }

  const updateField = (path: string, value: any) => {
    const keys = path.split('.')
    setFormData(prev => {
      const newData = JSON.parse(JSON.stringify(prev)) // Deep clone
      let current: any = newData
      for (let i = 0; i < keys.length - 1; i++) {
        current = current[keys[i]]
      }
      current[keys[keys.length - 1]] = value
      return newData
    })
  }

  const addArrayItem = (path: string, item: any) => {
    const keys = path.split('.')
    setFormData(prev => {
      const newData = JSON.parse(JSON.stringify(prev)) // Deep clone
      let current: any = newData
      
      // Navigate to the array (before the last key)
      for (let i = 0; i < keys.length - 1; i++) {
        current = current[keys[i]]
      }
      
      // Now push to the array at the last key
      const array = current[keys[keys.length - 1]]
      if (Array.isArray(array)) {
        array.push({ ...item })
      }
      
      return newData
    })
  }

  const updateArrayItem = (path: string, index: number, field: string, value: any) => {
    const keys = path.split('.')
    setFormData(prev => {
      const newData = JSON.parse(JSON.stringify(prev)) // Deep clone
      let current: any = newData
      
      // Navigate to the array
      for (let i = 0; i < keys.length; i++) {
        if (!current || !current[keys[i]]) {
          return newData
        }
        current = current[keys[i]]
      }
      
      // Now update the item in the array
      if (Array.isArray(current) && current[index]) {
        current[index][field] = value
      }
      
      return newData
    })
  }

  const removeArrayItem = (path: string, index: number) => {
    const keys = path.split('.')
    setFormData(prev => {
      const newData = JSON.parse(JSON.stringify(prev)) // Deep clone
      let current: any = newData
      for (let i = 0; i < keys.length - 1; i++) {
        current = current[keys[i]]
      }
      current.splice(index, 1)
      return newData
    })
  }

  const handleResetForm = () => {
    const defaults = createDefaultFormData()
    setFormData(defaults)
    setJsonOutput('')
    if (typeof window !== 'undefined') {
      window.localStorage.removeItem(STORAGE_KEY)
    }
    setAssetFiles({})
  }

  const handleStepImageSelection = (stepIndex: number, file: File) => {
    const newPath = assignAssetPath(file, formData.steps[stepIndex]?.image)
    setFormData((prev) => {
      const newData = JSON.parse(JSON.stringify(prev)) as FormDataState
      if (newData.steps[stepIndex]) {
        newData.steps[stepIndex].image = newPath
      }
      return newData
    })
  }

  const handleRemoveStepImage = (stepIndex: number) => {
    const currentPath = formData.steps[stepIndex]?.image
    if (currentPath) {
      removeAssetPath(currentPath)
      setFormData((prev) => {
        const newData = JSON.parse(JSON.stringify(prev)) as FormDataState
        if (newData.steps[stepIndex]) {
          newData.steps[stepIndex].image = ''
        }
        return newData
      })
    }
  }

  const handleMissionImageSelection = (file: File) => {
    const newPath = assignAssetPath(file, formData.missionPageImage)
    setFormData((prev) => ({
      ...prev,
      missionPageImage: newPath
    }))
  }

  const handleMissionImageRemove = () => {
    if (!formData.missionPageImage) return
    removeAssetPath(formData.missionPageImage)
    setFormData((prev) => ({
      ...prev,
      missionPageImage: ''
    }))
  }

  const handleIntroImageSelection = (file: File) => {
    const newPath = assignAssetPath(file, formData.intro.image)
    setFormData((prev) => ({
      ...prev,
      intro: {
        ...prev.intro,
        image: newPath
      }
    }))
  }

  const handleIntroImageRemove = () => {
    if (!formData.intro.image) return
    removeAssetPath(formData.intro.image)
    setFormData((prev) => ({
      ...prev,
      intro: {
        ...prev.intro,
        image: ''
      }
    }))
  }

  const handleBlockImageSelection = (stepIndex: number, blockIndex: number, file: File) => {
    const previousPath = formData.steps[stepIndex]?.blocks?.[blockIndex]?.image
    const newPath = assignAssetPath(file, previousPath)
    setFormData((prev) => {
      const newData = JSON.parse(JSON.stringify(prev)) as FormDataState
      if (!newData.steps[stepIndex].blocks) {
        newData.steps[stepIndex].blocks = []
      }
      if (!newData.steps[stepIndex].blocks[blockIndex]) {
        newData.steps[stepIndex].blocks[blockIndex] = createEmptyBlock()
      }
      newData.steps[stepIndex].blocks[blockIndex].image = newPath
      return newData
    })
  }

  const handleBlockImageRemove = (stepIndex: number, blockIndex: number) => {
    const currentPath = formData.steps[stepIndex]?.blocks?.[blockIndex]?.image
    if (!currentPath) return
    removeAssetPath(currentPath)
    setFormData((prev) => {
      const newData = JSON.parse(JSON.stringify(prev)) as FormDataState
      if (
        newData.steps[stepIndex] &&
        newData.steps[stepIndex].blocks &&
        newData.steps[stepIndex].blocks[blockIndex]
      ) {
        newData.steps[stepIndex].blocks[blockIndex].image = ''
      }
      return newData
    })
  }

  const handleRemoveBlock = (stepIndex: number, blockIndex: number) => {
    const block = formData.steps[stepIndex]?.blocks?.[blockIndex]
    if (block?.image) {
      removeAssetPath(block.image)
    }
    setFormData((prev) => {
      const newData = JSON.parse(JSON.stringify(prev)) as FormDataState
      if (newData.steps[stepIndex]?.blocks) {
        newData.steps[stepIndex].blocks.splice(blockIndex, 1)
      }
      return newData
    })
  }

  const handleResourceImageSelection = (resourceIndex: number, file: File) => {
    const previousPath = formData.resources[resourceIndex]?.path
    const newPath = assignAssetPath(file, previousPath)
    setFormData((prev) => {
      const newData = JSON.parse(JSON.stringify(prev)) as FormDataState
      if (!newData.resources[resourceIndex]) {
        newData.resources[resourceIndex] = { type: 'image', path: newPath }
      } else {
        newData.resources[resourceIndex].type = 'image'
        newData.resources[resourceIndex].path = newPath
      }
      return newData
    })
  }

  const handleResourceImageRemove = (resourceIndex: number) => {
    const currentPath = formData.resources[resourceIndex]?.path
    if (!currentPath) return
    removeAssetPath(currentPath)
    setFormData((prev) => {
      const newData = JSON.parse(JSON.stringify(prev)) as FormDataState
      if (newData.resources[resourceIndex]) {
        newData.resources[resourceIndex].path = ''
      }
      return newData
    })
  }

  const handleRemoveResource = (resourceIndex: number) => {
    const resource = formData.resources[resourceIndex]
    if (resource?.type === 'image' && resource.path) {
      removeAssetPath(resource.path)
    }
    setFormData((prev) => {
      const newData = JSON.parse(JSON.stringify(prev)) as FormDataState
      newData.resources.splice(resourceIndex, 1)
      return newData
    })
  }

  const handleRemoveStep = (stepIndex: number) => {
    const step = formData.steps[stepIndex]
    if (!step) return
    if (step.image) {
      removeAssetPath(step.image)
    }
    step.blocks?.forEach((block: any) => {
      if (block?.image) {
        removeAssetPath(block.image)
      }
    })
    setFormData((prev) => {
      const newData = JSON.parse(JSON.stringify(prev)) as FormDataState
      newData.steps.splice(stepIndex, 1)
      return newData
    })
  }

  const handleDownloadPackage = async () => {
    // Dynamically import jszip using require to avoid type errors at build time
    let JSZip
    try {
      // @ts-ignore
      JSZip = (await import('jszip')).default
    } catch (e) {
      // Fallback if import fails (for SSR, e.g.)
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      JSZip = require('jszip')
    }
    const zip = new JSZip()

    const jsonFileName = `${sanitizeFileName(formData.title || 'mission') || 'mission'}.json`
    const jsonContent = jsonOutput || JSON.stringify(formData, null, 2)
    zip.file(jsonFileName, jsonContent)

    Object.entries(assetFiles).forEach(([path, file]) => {
      zip.file(path, file)
    })

    const blob = await zip.generateAsync({ type: 'blob' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `${sanitizeFileName(formData.title || 'mission') || 'mission'}-package.zip`
    link.click()
    URL.revokeObjectURL(url)
  }

  return (
      <div className="space-y-6">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Mission Generator</h1>
          <p className="mt-1 text-sm text-gray-500">Create mission JSON files following Instructables format</p>
          </div>
          <button
            onClick={handleResetForm}
            className="inline-flex items-center justify-center rounded-md border border-gray-300 px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100"
          >
            Clear saved form
          </button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Form Section */}
          <div className="space-y-6">
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center gap-3 mb-6">
            <Wand2 className="h-8 w-8 text-purple-600" />
                <h2 className="text-lg font-semibold text-gray-900">Mission Details</h2>
          </div>

          <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Version</label>
                    <input
                      type="number"
                      value={formData.version}
                      onChange={(e) => updateField('version', parseInt(e.target.value))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Layout</label>
                    <input
                      type="text"
                      value={formData.layout}
                      onChange={(e) => updateField('layout', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Title *</label>
                  <input
                    type="text"
                    value={formData.title}
                    onChange={(e) => updateField('title', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md"
                    placeholder="e.g., Keyboard Pilot"
                  />
                </div>

            <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Description *</label>
              <textarea
                    value={formData.description}
                    onChange={(e) => updateField('description', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md"
                    rows={3}
                    placeholder="Mission description..."
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Mission Time (mins)</label>
                    <input
                      type="number"
                      value={formData.mission_time}
                      onChange={(e) => updateField('mission_time', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md"
                    />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Difficulty</label>
                    <input
                      type="number"
                      value={formData.Difficulty}
                      onChange={(e) => updateField('Difficulty', parseInt(e.target.value))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md"
                      min="1"
                      max="5"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Mission Page Image</label>
                  <ImageDropZone
                    title="Mission page image"
                    path={formData.missionPageImage}
                    previewUrl={
                      formData.missionPageImage ? assetPreviews[formData.missionPageImage] : undefined
                    }
                    file={formData.missionPageImage ? assetFiles[formData.missionPageImage] : undefined}
                    onSelect={handleMissionImageSelection}
                    onRemove={formData.missionPageImage ? handleMissionImageRemove : undefined}
                  />
                </div>

                {/* Intro Section */}
                <div className="border-t pt-4">
                  <h3 className="font-semibold text-gray-900 mb-3">Intro</h3>
                  <div className="space-y-3">
                    <ImageDropZone
                      title="Intro image"
                      path={formData.intro.image}
                      previewUrl={
                        formData.intro.image ? assetPreviews[formData.intro.image] : undefined
                      }
                      file={formData.intro.image ? assetFiles[formData.intro.image] : undefined}
                      onSelect={handleIntroImageSelection}
                      onRemove={formData.intro.image ? handleIntroImageRemove : undefined}
                    />
                    <input
                      type="text"
                      value={formData.intro.timeAllocated}
                      onChange={(e) => updateField('intro.timeAllocated', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md"
                      placeholder="Time allocated"
                    />
                    <textarea
                      value={formData.intro.description}
                      onChange={(e) => updateField('intro.description', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md"
                      rows={2}
                      placeholder="Intro description"
                    />
                  </div>
                </div>

                {/* Learn Before You Code */}
                <div className="border-t pt-4">
                  <h3 className="font-semibold text-gray-900 mb-3">Learn Before You Code</h3>
                  {formData.learn_before_you_code.map((item, idx) => (
                    <div key={idx} className="mb-3 p-3 border rounded-md">
                      <div className="flex justify-between items-center mb-2">
                        <span className="font-medium text-sm">Topic {idx + 1}</span>
                        <button
                          onClick={() => removeArrayItem('learn_before_you_code', idx)}
                          className="text-red-600"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                      <input
                        type="text"
                        value={item.topic}
                        onChange={(e) => updateArrayItem('learn_before_you_code', idx, 'topic', e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md mb-2"
                        placeholder="Topic"
                      />
                      <textarea
                        value={item.explanation}
                        onChange={(e) => updateArrayItem('learn_before_you_code', idx, 'explanation', e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md"
                        rows={2}
                        placeholder="Explanation"
                      />
                    </div>
                  ))}
                  <button
                    onClick={() => addArrayItem('learn_before_you_code', { topic: '', explanation: '' })}
                    className="flex items-center gap-2 text-purple-600"
                  >
                    <Plus className="h-4 w-4" />
                    Add Topic
                  </button>
                </div>

                {/* Requirements */}
                <div className="border-t pt-4">
                  <h3 className="font-semibold text-gray-900 mb-3">Requirements</h3>
                  {formData.requirements.map((req, idx) => (
                    <div key={idx} className="mb-2 flex gap-2">
                      <input
                        type="text"
                        value={req}
                        onChange={(e) => {
                          const newRequirements = [...formData.requirements]
                          newRequirements[idx] = e.target.value
                          setFormData(prev => ({ ...prev, requirements: newRequirements }))
                        }}
                        className="flex-1 px-3 py-2 border border-gray-300 rounded-md"
                        placeholder="Requirement"
                      />
                      {formData.requirements.length > 1 && (
                        <button
                          onClick={() => {
                            const newRequirements = formData.requirements.filter((_, i) => i !== idx)
                            setFormData(prev => ({ ...prev, requirements: newRequirements }))
                          }}
                          className="text-red-600 px-2"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      )}
                    </div>
                  ))}
                  <button
                    onClick={() => setFormData(prev => ({ ...prev, requirements: [...prev.requirements, ''] }))}
                    className="flex items-center gap-2 text-purple-600"
                  >
                    <Plus className="h-4 w-4" />
                    Add Requirement
                  </button>
                </div>

                {/* Blocks Used */}
                <div className="border-t pt-4">
                  <h3 className="font-semibold text-gray-900 mb-3">Blocks Used</h3>
                  {formData.blocks_used.map((block, idx) => (
                    <div key={idx} className="mb-2 flex gap-2">
                      <input
                        type="text"
                        value={block}
                        onChange={(e) => {
                          const newBlocks = [...formData.blocks_used]
                          newBlocks[idx] = e.target.value
                          setFormData(prev => ({ ...prev, blocks_used: newBlocks }))
                        }}
                        className="flex-1 px-3 py-2 border border-gray-300 rounded-md"
                        placeholder="Block name"
                      />
                      {formData.blocks_used.length > 1 && (
                        <button
                          onClick={() => {
                            const newBlocks = formData.blocks_used.filter((_, i) => i !== idx)
                            setFormData(prev => ({ ...prev, blocks_used: newBlocks }))
                          }}
                          className="text-red-600 px-2"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      )}
                    </div>
                  ))}
                  <button
                    onClick={() => setFormData(prev => ({ ...prev, blocks_used: [...prev.blocks_used, ''] }))}
                    className="flex items-center gap-2 text-purple-600"
                  >
                    <Plus className="h-4 w-4" />
                    Add Block
                  </button>
                </div>

                {/* Steps */}
                <div className="border-t pt-4">
                  <h3 className="font-semibold text-gray-900 mb-3">Steps</h3>
                  {formData.steps.map((step, idx) => (
                    <div key={idx} className="mb-4 p-3 border rounded-md">
                      <div className="flex justify-between items-center mb-3">
                        <span className="font-medium">Step {idx + 1}</span>
                        <button
                          onClick={() => handleRemoveStep(idx)}
                          className="text-red-600"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                      <div className="space-y-2">
                        <input
                          type="text"
                          value={step.title}
                          onChange={(e) => updateArrayItem('steps', idx, 'title', e.target.value)}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md"
                          placeholder="Step title"
                        />
                        <input
                          type="number"
                          value={step.points}
                          onChange={(e) => updateArrayItem('steps', idx, 'points', parseInt(e.target.value))}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md"
                          placeholder="Points"
                        />
                        <textarea
                          value={step.instruction}
                          onChange={(e) => updateArrayItem('steps', idx, 'instruction', e.target.value)}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md"
                          rows={2}
                          placeholder="Instruction"
                        />
                        <input
                          type="text"
                          value={step.note}
                          onChange={(e) => updateArrayItem('steps', idx, 'note', e.target.value)}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md"
                          placeholder="Note"
                        />
                        <ImageDropZone
                          title={`Step ${idx + 1} image`}
                          path={step.image}
                          previewUrl={step.image ? assetPreviews[step.image] : undefined}
                          file={step.image ? assetFiles[step.image] : undefined}
                          onSelect={(file) => handleStepImageSelection(idx, file)}
                          onRemove={step.image ? () => handleRemoveStepImage(idx) : undefined}
                        />
                        <textarea
                          value={step.hint}
                          onChange={(e) => updateArrayItem('steps', idx, 'hint', e.target.value)}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md"
                          rows={2}
                          placeholder="Hint (optional)"
                        />
                        <textarea
                          value={step.important}
                          onChange={(e) => updateArrayItem('steps', idx, 'important', e.target.value)}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md"
                          rows={2}
                          placeholder="Important note (optional)"
                        />
                        <textarea
                          value={step.tryThis}
                          onChange={(e) => updateArrayItem('steps', idx, 'tryThis', e.target.value)}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md"
                          rows={2}
                          placeholder="Try This"
                        />
                        <textarea
                          value={step.whyItWorks}
                          onChange={(e) => updateArrayItem('steps', idx, 'whyItWorks', e.target.value)}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md"
                          rows={2}
                          placeholder="Why It Works"
                        />
                        
                        {/* Blocks Section */}
                        <div className="border-t mt-3 pt-3">
                          <h4 className="font-medium mb-2">Blocks</h4>
                          {step.blocks?.map((block: any, blockIdx: number) => (
                            <div key={blockIdx} className="mb-2 p-2 bg-gray-50 rounded border">
                              <div className="flex justify-between items-center mb-2">
                                <span className="text-xs text-gray-600">Block {blockIdx + 1}</span>
                                <button
                                  onClick={() => handleRemoveBlock(idx, blockIdx)}
                                  className="text-red-600 text-xs"
                                >
                                  Remove
                                </button>
                              </div>
                              <ImageDropZone
                                title={`Block ${blockIdx + 1} image`}
                                path={block.image || ''}
                                previewUrl={
                                  block.image ? assetPreviews[block.image] : undefined
                                }
                                file={block.image ? assetFiles[block.image] : undefined}
                                onSelect={(file) => handleBlockImageSelection(idx, blockIdx, file)}
                                onRemove={
                                  block.image
                                    ? () => handleBlockImageRemove(idx, blockIdx)
                                    : undefined
                                }
                              />
                              <input
                                type="text"
                                value={block.alt || ''}
                                onChange={(e) => {
                                  const newData = JSON.parse(JSON.stringify(formData))
                                  newData.steps[idx].blocks[blockIdx].alt = e.target.value
                                  setFormData(newData)
                                }}
                                className="w-full px-3 py-2 border border-gray-300 rounded-md mb-2"
                                placeholder="Alt text"
                              />
                              <textarea
                                value={block.description || ''}
                                onChange={(e) => {
                                  const newData = JSON.parse(JSON.stringify(formData))
                                  newData.steps[idx].blocks[blockIdx].description = e.target.value
                                  setFormData(newData)
                                }}
                                className="w-full px-3 py-2 border border-gray-300 rounded-md"
                                rows={2}
                                placeholder="Description"
                              />
                            </div>
                          ))}
                          <button
                            onClick={() => {
                              const newData = JSON.parse(JSON.stringify(formData))
                              if (!newData.steps[idx].blocks) {
                                newData.steps[idx].blocks = []
                              }
                          newData.steps[idx].blocks.push(createEmptyBlock())
                              setFormData(newData)
                            }}
                            className="flex items-center gap-2 text-purple-600 text-sm"
                          >
                            <Plus className="h-4 w-4" />
                            Add Block
                          </button>
                        </div>
                        
                        {/* MCQ Section */}
                        <div className="border-t mt-3 pt-3">
                          <h4 className="font-medium mb-2">MCQ</h4>
                          <select
                            value={
                              step.mcq?.compalsary === null || step.mcq?.compalsary === undefined
                                ? ''
                                : step.mcq?.compalsary
                                  ? 'true'
                                  : 'false'
                            }
                            onChange={(e) => {
                              const newData = JSON.parse(JSON.stringify(formData))
                              if (e.target.value === '') {
                                newData.steps[idx].mcq.compalsary = null
                              } else {
                                newData.steps[idx].mcq.compalsary = e.target.value === 'true'
                              }
                              setFormData(newData)
                            }}
                            className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:ring-blue-500 mb-2"
                          >
                            <option value="">Compulsory question?</option>
                            <option value="true">True</option>
                            <option value="false">False</option>
                          </select>
                        
                          <input
                            type="text"
                            value={step.mcq?.question || ''}
                            onChange={(e) => {
                              const newData = JSON.parse(JSON.stringify(formData))
                              newData.steps[idx].mcq.question = e.target.value
                              setFormData(newData)
                            }}
                            className="w-full px-3 py-2 border border-gray-300 rounded-md mb-2"
                            placeholder="Question"
                          />
                          <div className="space-y-1">
                            {step.mcq?.options?.map((opt: string, optIdx: number) => (
                              <input
                                key={optIdx}
                                type="text"
                                value={opt}
                                onChange={(e) => {
                                  const newData = JSON.parse(JSON.stringify(formData))
                                  newData.steps[idx].mcq.options[optIdx] = e.target.value
                                  setFormData(newData)
                                }}
                                className="w-full px-3 py-2 border border-gray-300 rounded-md"
                                placeholder={`Option ${optIdx + 1}`}
                              />
                            ))}
                          </div>
                          <div className="grid grid-cols-2 gap-2 mt-2">
                            <div>
                              <label className="block text-xs text-gray-600 mb-1">Correct Answer (0-3)</label>
                              <input
                                type="number"
                                value={step.mcq?.correctAnswer || 0}
                                onChange={(e) => {
                                  const newData = JSON.parse(JSON.stringify(formData))
                                  newData.steps[idx].mcq.correctAnswer = parseInt(e.target.value)
                                  setFormData(newData)
                                }}
                                className="w-full px-3 py-2 border border-gray-300 rounded-md"
                                min="0"
                                max="3"
                              />
                            </div>
                          </div>
                          <div className="grid grid-cols-2 gap-2 mt-2">
                            <input
                              type="text"
                              value={step.mcq?.feedback?.success || ''}
                              onChange={(e) => {
                                const newData = JSON.parse(JSON.stringify(formData))
                                newData.steps[idx].mcq.feedback.success = e.target.value
                                setFormData(newData)
                              }}
                              className="w-full px-3 py-2 border border-gray-300 rounded-md"
                              placeholder="Success feedback"
                            />
                            <input
                              type="text"
                              value={step.mcq?.feedback?.retry || ''}
                              onChange={(e) => {
                                const newData = JSON.parse(JSON.stringify(formData))
                                newData.steps[idx].mcq.feedback.retry = e.target.value
                                setFormData(newData)
                              }}
                              className="w-full px-3 py-2 border border-gray-300 rounded-md"
                              placeholder="Retry feedback"
                            />
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                  <button
                    onClick={() => addArrayItem('steps', createEmptyStep())}
                    className="flex items-center gap-2 text-purple-600"
                  >
                    <Plus className="h-4 w-4" />
                    Add Step
                  </button>
                </div>

                {/* Mission Reference Code */}
                <div className="border-t pt-4">
                  <h3 className="font-semibold text-gray-900 mb-3">Mission Reference Code</h3>
                  <input
                    type="text"
                    value={formData.mission_reference_code}
                    onChange={(e) => updateField('mission_reference_code', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md"
                    placeholder="e.g., all.xml"
                  />
                </div>

                {/* Report Card */}
                <div className="border-t pt-4">
                  <h3 className="font-semibold text-gray-900 mb-3">Report Card</h3>
                  {formData.report_card.map((task, idx) => (
                    <div key={idx} className="mb-2 flex gap-2">
                      <input
                        type="text"
                        value={task.task}
                        onChange={(e) => {
                          const newData = JSON.parse(JSON.stringify(formData))
                          newData.report_card[idx].task = e.target.value
                          setFormData(newData)
                        }}
                        className="flex-1 px-3 py-2 border border-gray-300 rounded-md"
                        placeholder="Task name"
                      />
                      <input
                        type="number"
                        value={task.points}
                        onChange={(e) => {
                          const newData = JSON.parse(JSON.stringify(formData))
                          newData.report_card[idx].points = parseInt(e.target.value) || 0
                          setFormData(newData)
                        }}
                        className="w-24 px-3 py-2 border border-gray-300 rounded-md"
                        placeholder="Points"
                      />
                      {formData.report_card.length > 1 && (
                        <button
                          onClick={() => {
                            const newData = JSON.parse(JSON.stringify(formData))
                            newData.report_card = newData.report_card.filter((_: any, i: number) => i !== idx)
                            setFormData(newData)
                          }}
                          className="text-red-600 px-2"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      )}
                    </div>
                  ))}
                  <button
                    onClick={() => {
                      const newData = JSON.parse(JSON.stringify(formData))
                      newData.report_card.push({ task: '', points: 0 })
                      setFormData(newData)
                    }}
                    className="flex items-center gap-2 text-purple-600"
                  >
                    <Plus className="h-4 w-4" />
                    Add Task
                  </button>
                </div>

                {/* Total Points */}
                <div className="border-t pt-4">
                  <h3 className="font-semibold text-gray-900 mb-3">Total Points</h3>
                  <input
                    type="number"
                    value={formData.total_points}
                    onChange={(e) => updateField('total_points', parseInt(e.target.value) || 0)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md"
                    placeholder="Total points"
                  />
                </div>

                {/* Learning Outcomes */}
                <div className="border-t pt-4">
                  <h3 className="font-semibold text-gray-900 mb-3">Learning Outcomes</h3>
                  {formData.learning_outcomes.map((outcome, idx) => (
                    <div key={idx} className="mb-2 flex gap-2">
                      <input
                        type="text"
                        value={outcome}
                        onChange={(e) => {
                          const newData = JSON.parse(JSON.stringify(formData))
                          newData.learning_outcomes[idx] = e.target.value
                          setFormData(newData)
                        }}
                        className="flex-1 px-3 py-2 border border-gray-300 rounded-md"
                        placeholder="Learning outcome"
                      />
                      {formData.learning_outcomes.length > 1 && (
                        <button
                          onClick={() => {
                            const newData = JSON.parse(JSON.stringify(formData))
                            newData.learning_outcomes = newData.learning_outcomes.filter((_: any, i: number) => i !== idx)
                            setFormData(newData)
                          }}
                          className="text-red-600 px-2"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      )}
                    </div>
                  ))}
                  <button
                    onClick={() => {
                      const newData = JSON.parse(JSON.stringify(formData))
                      newData.learning_outcomes.push('')
                      setFormData(newData)
                    }}
                    className="flex items-center gap-2 text-purple-600"
                  >
                    <Plus className="h-4 w-4" />
                    Add Learning Outcome
                  </button>
                </div>

                {/* Resources */}
                <div className="border-t pt-4">
                  <h3 className="font-semibold text-gray-900 mb-3">Resources</h3>
                  {formData.resources.map((resource, idx) => (
                    <div key={idx} className="mb-3 p-3 bg-gray-50 rounded border">
                      <div className="flex justify-between items-center mb-2">
                        <span className="text-xs text-gray-600">Resource {idx + 1}</span>
                        <button
                        onClick={() => handleRemoveResource(idx)}
                          className="text-red-600"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                      <select
                        value={resource.type}
                        onChange={(e) => {
                          const nextType = e.target.value
                          setFormData((prev) => {
                            const newData = JSON.parse(JSON.stringify(prev)) as FormDataState
                            if (
                              nextType !== 'image' &&
                              newData.resources[idx].type === 'image' &&
                              newData.resources[idx].path
                            ) {
                              removeAssetPath(newData.resources[idx].path)
                              newData.resources[idx].path = ''
                            }
                            newData.resources[idx].type = nextType
                            return newData
                          })
                        }}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md mb-2"
                      >
                        <option value="image">Image</option>
                        <option value="video">Video</option>
                        <option value="file">File</option>
                        <option value="link">Link</option>
                </select>
                      {resource.type === 'image' ? (
                        <ImageDropZone
                          title={`Resource ${idx + 1} image`}
                          path={resource.path}
                          previewUrl={
                            resource.path ? assetPreviews[resource.path] : undefined
                          }
                          file={resource.path ? assetFiles[resource.path] : undefined}
                          onSelect={(file) => handleResourceImageSelection(idx, file)}
                          onRemove={
                            resource.path ? () => handleResourceImageRemove(idx) : undefined
                          }
                        />
                      ) : (
                      <input
                        type="text"
                        value={resource.path}
                        onChange={(e) => {
                          const newData = JSON.parse(JSON.stringify(formData))
                          newData.resources[idx].path = e.target.value
                          setFormData(newData)
                        }}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md"
                        placeholder="Resource path"
                      />
                      )}
                    </div>
                  ))}
                  <button
                    onClick={() => {
                      const newData = JSON.parse(JSON.stringify(formData))
                      newData.resources.push({ type: 'image', path: '' })
                      setFormData(newData)
                    }}
                    className="flex items-center gap-2 text-purple-600"
                  >
                    <Plus className="h-4 w-4" />
                    Add Resource
                  </button>
              </div>
            </div>

            <button
                onClick={generateJSON}
                className="w-full mt-6 px-6 py-3 bg-purple-600 text-white rounded-md hover:bg-purple-700"
              >
                Generate JSON
            </button>
          </div>
        </div>

          {/* JSON Output Section */}
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-gray-900">Generated JSON</h2>
              {jsonOutput && (
                <div className="flex gap-2">
                <button
                  onClick={downloadJSON}
                  className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700"
                >
                  <Download className="h-5 w-5" />
                    Download JSON
                </button>
                  <button
                    onClick={handleDownloadPackage}
                    className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
                    disabled={!jsonOutput && Object.keys(assetFiles).length === 0}
                  >
                    <Download className="h-5 w-5" />
                    Download Package
                  </button>
                </div>
              )}
            </div>
            {Object.keys(assetFiles).length > 0 && (
              <div className="mb-4 rounded-md border border-blue-200 bg-blue-50 p-3 text-xs text-blue-800">
                <p className="font-semibold mb-1">Assets</p>
                <ul className="space-y-1">
                  {Object.keys(assetFiles).map((assetPath) => (
                    <li key={assetPath} className="flex justify-between gap-2">
                      <span>{assetPath}</span>
                      <button
                        type="button"
                        onClick={() => {
                          removeAssetPath(assetPath)
                          setFormData((prev) => {
                            const newData = JSON.parse(JSON.stringify(prev)) as FormDataState
                            if (newData.missionPageImage === assetPath) {
                              newData.missionPageImage = ''
                            }
                            if (newData.intro.image === assetPath) {
                              newData.intro.image = ''
                            }
                            newData.steps = newData.steps.map((step) => ({
                              ...step,
                              image: step.image === assetPath ? '' : step.image,
                              blocks: step.blocks?.map((block: any) => ({
                                ...block,
                                image: block.image === assetPath ? '' : block.image
                              })) || []
                            }))
                            newData.resources = newData.resources.map((resource) => ({
                              ...resource,
                              path: resource.path === assetPath ? '' : resource.path
                            }))
                            return newData
                          })
                        }}
                        className="text-blue-700 hover:underline"
                      >
                        Remove
                      </button>
                    </li>
                  ))}
                </ul>
              </div>
            )}
            <pre className="bg-gray-50 border rounded-md p-4 overflow-auto max-h-[calc(100vh-200px)] text-sm">
              {jsonOutput || 'Generated JSON will appear here...'}
            </pre>
          </div>
        </div>
      </div>
  )
}

