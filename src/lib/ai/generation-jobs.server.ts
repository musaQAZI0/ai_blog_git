import 'server-only'

import { FieldValue } from 'firebase-admin/firestore'
import { generateArticle } from '@/lib/ai'
import { getAdminDb } from '@/lib/firebase/admin'
import { AIGenerationMode, AIGenerationResponse, AIProvider, TargetAudience } from '@/types'

const COLLECTION = 'aiGenerationJobs'

export type GenerationJobStatus = 'queued' | 'running' | 'completed' | 'failed'

export type GenerationJobSnapshot = {
  id: string
  status: GenerationJobStatus
  stage?: string
  error?: string
  result?: AIGenerationResponse
  createdBy: string
}

type CreateGenerationJobInput = {
  jobId?: string
  createdBy: string
  pdfContent: string
  targetAudience: TargetAudience
  provider: AIProvider
  generateImage: boolean
  generationMode: AIGenerationMode
}

function serializeForFirestore<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T
}

function publicErrorMessage(error: unknown): string {
  const message = error instanceof Error ? error.message : String(error || '')
  if (!message) return 'Generowanie nie powiodlo sie.'

  if (
    message.toLowerCase().includes('quality checks') ||
    message.toLowerCase().includes('invalid or too short') ||
    message.toLowerCase().includes('garbage')
  ) {
    return 'Model AI zwrocil niepelny albo nieprawidlowy artykul. System sprobowal fallbackow, ale nie uzyskal poprawnej tresci.'
  }

  if (message.length > 600) return `${message.slice(0, 600)}...`
  return message
}

export async function createGenerationJob(input: CreateGenerationJobInput): Promise<string> {
  const db = getAdminDb()
  const ref = input.jobId ? db.collection(COLLECTION).doc(input.jobId) : db.collection(COLLECTION).doc()
  const existing = await ref.get()

  if (existing.exists) {
    const data = existing.data() || {}
    if (data.createdBy !== input.createdBy) {
      throw new Error('Generation job id is already in use.')
    }
    return ref.id
  }

  await ref.set({
    status: 'queued',
    stage: 'queued',
    createdBy: input.createdBy,
    targetAudience: input.targetAudience,
    provider: input.provider,
    generateImage: input.generateImage,
    generationMode: input.generationMode,
    pdfContent: input.pdfContent,
    createdAt: FieldValue.serverTimestamp(),
    updatedAt: FieldValue.serverTimestamp(),
  })

  setTimeout(() => {
    void runGenerationJob(ref.id)
  }, 0)

  return ref.id
}

export async function getGenerationJob(jobId: string): Promise<GenerationJobSnapshot | null> {
  const snap = await getAdminDb().collection(COLLECTION).doc(jobId).get()
  if (!snap.exists) return null

  const data = snap.data() || {}
  return {
    id: snap.id,
    status: (data.status || 'queued') as GenerationJobStatus,
    stage: typeof data.stage === 'string' ? data.stage : undefined,
    error: typeof data.error === 'string' ? data.error : undefined,
    result: data.result as AIGenerationResponse | undefined,
    createdBy: String(data.createdBy || ''),
  }
}

async function runGenerationJob(jobId: string): Promise<void> {
  const db = getAdminDb()
  const ref = db.collection(COLLECTION).doc(jobId)

  const snap = await ref.get()
  if (!snap.exists) return

  const data = snap.data() || {}
  if (data.status !== 'queued') return

  await ref.set(
    {
      status: 'running',
      stage: 'generating',
      startedAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
    },
    { merge: true }
  )

  try {
    const result = await generateArticle({
      pdfContent: String(data.pdfContent || ''),
      targetAudience: data.targetAudience as TargetAudience,
      provider: data.provider as AIProvider,
      generateImage: data.generateImage !== false,
      generationMode: (data.generationMode || 'full') as AIGenerationMode,
    })

    await ref.set(
      {
        status: 'completed',
        stage: 'completed',
        result: serializeForFirestore(result),
        pdfContent: FieldValue.delete(),
        completedAt: FieldValue.serverTimestamp(),
        updatedAt: FieldValue.serverTimestamp(),
      },
      { merge: true }
    )
  } catch (error) {
    console.error(`[ai/jobs] Job ${jobId} failed:`, error)
    await ref.set(
      {
        status: 'failed',
        stage: 'failed',
        error: publicErrorMessage(error),
        pdfContent: FieldValue.delete(),
        failedAt: FieldValue.serverTimestamp(),
        updatedAt: FieldValue.serverTimestamp(),
      },
      { merge: true }
    )
  }
}
