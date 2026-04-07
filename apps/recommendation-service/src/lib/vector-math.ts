export function initialPreferenceVector(contentEmbedding: number[], weight: number): number[] {
  const sign = weight >= 0 ? 1 : -1
  return contentEmbedding.map((v) => v * sign)
}

export function updatePreferenceVector(
  oldVector: number[],
  totalWeight: number,
  contentEmbedding: number[],
  eventWeight: number,
): number[] {
  const absWeight = Math.abs(eventWeight)
  const newTotalWeight = totalWeight + absWeight

  return oldVector.map(
    (oldVal, i) => (oldVal * totalWeight + contentEmbedding[i] * eventWeight) / newTotalWeight,
  )
}

