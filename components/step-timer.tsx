"use client"

import { useState, useEffect } from "react"
import { Play, Pause, RotateCcw, Timer } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"

interface StepTimerProps {
  duration: string
  action: string
}

function parseTimeString(timeStr: string): number {
  // Handle "X minutes" format
  const minutesMatch = timeStr.match(/(\d+)(?:\+)?\s*(?:minute|min)s?/)
  if (minutesMatch) {
    return parseInt(minutesMatch[1]) * 60
  }

  // Handle "X-Y minutes" format
  const rangeMatch = timeStr.match(/(\d+)\s*-\s*(\d+)\s*(?:minute|min)s?/)
  if (rangeMatch) {
    // Use the lower bound for the timer
    return parseInt(rangeMatch[1]) * 60
  }

  // Handle "few minutes" format
  if (timeStr.includes("few minutes")) {
    return 3 * 60 // Default to 3 minutes
  }

  // Handle "X seconds" format
  const secondsMatch = timeStr.match(/(\d+)\s*seconds?/)
  if (secondsMatch) {
    return parseInt(secondsMatch[1])
  }

  // Default fallback
  return 5 * 60 // Default to 5 minutes if format is not recognized
}

export default function StepTimer({ duration, action }: StepTimerProps) {
  const initial = parseTimeString(duration)
  const [timeLeft, setTimeLeft] = useState(initial)
  const [isRunning, setIsRunning] = useState(false)
  const [isComplete, setIsComplete] = useState(false)

  useEffect(() => {
    let interval: NodeJS.Timeout | null = null

    if (isRunning && timeLeft > 0) {
      interval = setInterval(() => {
        setTimeLeft((prev) => {
          if (prev <= 1) {
            setIsRunning(false)
            setIsComplete(true)
            return 0
          }
          return prev - 1
        })
      }, 1000)
    } else if (!isRunning && interval) {
      clearInterval(interval)
    }

    return () => {
      if (interval) clearInterval(interval)
    }
  }, [isRunning, timeLeft])

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`
  }

  const toggleTimer = () => {
    setIsRunning(!isRunning)
  }

  const resetTimer = () => {
    setTimeLeft(initial)
    setIsRunning(false)
    setIsComplete(false)
  }

  return (
    <Card
      className={`${isComplete ? "border-emerald-500 border-2" : "border-orange-200 border-2"} bg-white/90 backdrop-blur-sm shadow-lg`}
    >
      <CardContent className="p-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Timer className="h-7 w-7 text-orange-600" />
            <div className="flex flex-col">
              <span className="font-semibold text-2xl text-gray-800">Timer</span>
              <span className="text-sm text-gray-600">{action}</span>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <span className={`font-mono text-4xl font-bold ${isComplete ? "text-emerald-600" : "text-gray-800"}`}>
              {formatTime(timeLeft)}
            </span>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="lg"
                onClick={toggleTimer}
                disabled={isComplete || timeLeft === 0}
                className="h-12 w-12 bg-white/80 backdrop-blur-sm border-2"
              >
                {isRunning ? <Pause className="h-6 w-6" /> : <Play className="h-6 w-6" />}
              </Button>
              <Button
                variant="outline"
                size="lg"
                onClick={resetTimer}
                className="h-12 w-12 bg-white/80 backdrop-blur-sm border-2"
              >
                <RotateCcw className="h-6 w-6" />
              </Button>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

export { StepTimer }
