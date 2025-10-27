'use client'

import { useState } from 'react'
import { Wand2, Download, Plus, Trash2 } from 'lucide-react'

export default function MissionGeneratorPage() {
  const [jsonOutput, setJsonOutput] = useState('')
  const [formData, setFormData] = useState({
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
    steps: [{
      title: '',
      points: 0,
      instruction: '',
      note: '',
      image: '',
      blocks: [{ image: '', alt: '', description: '' }],
      tryThis: '',
      whyItWorks: '',
      mcq: {
        question: '',
        options: ['', '', '', ''],
        correctAnswer: 0,
        feedback: { success: '', retry: '' }
      }
    }],
    mission_reference_code: '',
    report_card: [{ task: '', points: 0 }],
    total_points: 0,
    learning_outcomes: [''],
    resources: [{ type: 'image', path: '' }]
  })

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

  return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Mission Generator</h1>
          <p className="mt-1 text-sm text-gray-500">Create mission JSON files following Instructables format</p>
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
                  <input
                    type="text"
                    value={formData.missionPageImage}
                    onChange={(e) => updateField('missionPageImage', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md"
                    placeholder="missions_page_image.png"
                  />
                </div>

                {/* Intro Section */}
                <div className="border-t pt-4">
                  <h3 className="font-semibold text-gray-900 mb-3">Intro</h3>
                  <div className="space-y-3">
                    <input
                      type="text"
                      value={formData.intro.image}
                      onChange={(e) => updateField('intro.image', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md"
                      placeholder="Intro image"
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
                          onClick={() => removeArrayItem('steps', idx)}
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
                        <input
                          type="text"
                          value={step.image}
                          onChange={(e) => updateArrayItem('steps', idx, 'image', e.target.value)}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md"
                          placeholder="Step image"
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
                                  onClick={() => {
                                    const newData = JSON.parse(JSON.stringify(formData))
                                    newData.steps[idx].blocks.splice(blockIdx, 1)
                                    setFormData(newData)
                                  }}
                                  className="text-red-600 text-xs"
                                >
                                  Remove
                                </button>
                              </div>
                              <input
                                type="text"
                                value={block.image || ''}
                                onChange={(e) => {
                                  const newData = JSON.parse(JSON.stringify(formData))
                                  newData.steps[idx].blocks[blockIdx].image = e.target.value
                                  setFormData(newData)
                                }}
                                className="w-full px-3 py-2 border border-gray-300 rounded-md mb-2"
                                placeholder="Image filename"
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
                              newData.steps[idx].blocks.push({ image: '', alt: '', description: '' })
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
                    onClick={() => addArrayItem('steps', {
                    title: '',
                    points: 0,
                    instruction: '',
                    note: '',
                    image: '',
                    blocks: [{ image: '', alt: '', description: '' }],
                    tryThis: '',
                    whyItWorks: '',
                    mcq: {
                      question: '',
                      options: ['', '', '', ''],
                      correctAnswer: 0,
                      feedback: { success: '', retry: '' }
                    }
                  })}
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
                          onClick={() => {
                            const newData = JSON.parse(JSON.stringify(formData))
                            newData.resources.splice(idx, 1)
                            setFormData(newData)
                          }}
                          className="text-red-600"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                      <select
                        value={resource.type}
                        onChange={(e) => {
                          const newData = JSON.parse(JSON.stringify(formData))
                          newData.resources[idx].type = e.target.value
                          setFormData(newData)
                        }}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md mb-2"
                      >
                        <option value="image">Image</option>
                        <option value="video">Video</option>
                        <option value="file">File</option>
                        <option value="link">Link</option>
                </select>
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
                <button
                  onClick={downloadJSON}
                  className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700"
                >
                  <Download className="h-5 w-5" />
                  Download
                </button>
              )}
            </div>
            <pre className="bg-gray-50 border rounded-md p-4 overflow-auto max-h-[calc(100vh-200px)] text-sm">
              {jsonOutput || 'Generated JSON will appear here...'}
            </pre>
          </div>
        </div>
      </div>
  )
}

