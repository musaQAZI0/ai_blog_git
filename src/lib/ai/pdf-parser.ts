// Note: pdf-parse should be used on the server side only
import pdf from 'pdf-parse'

export async function extractTextFromPDF(buffer: Buffer): Promise<string> {
  try {
    const data = await pdf(buffer)
    return data.text
  } catch (error) {
    console.error('PDF parsing error:', error)
    throw new Error('Failed to parse PDF file')
  }
}

export async function extractTextFromMultiplePDFs(
  buffers: Buffer[]
): Promise<string> {
  const texts = await Promise.all(
    buffers.map((buffer) => extractTextFromPDF(buffer))
  )
  return texts.join('\n\n---\n\n')
}
