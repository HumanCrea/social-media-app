import { useState, useRef, useEffect } from 'react'
import { useMutation } from '@tanstack/react-query'
import axios from 'axios'

interface Reaction {
  id: string
  emoji: string
  x: number
  y: number
  timestamp: number
  userId?: string
}

interface LiveReactionsProps {
  postId: string
  onReactionSent?: (emoji: string) => void
}

const AVAILABLE_REACTIONS = ['❤️', '😂', '😮', '😢', '😡', '👏', '🔥', '💯', '🎉', '⭐']

export default function LiveReactions({ postId, onReactionSent }: LiveReactionsProps) {
  const [reactions, setReactions] = useState<Reaction[]>([])
  const [showPicker, setShowPicker] = useState(false)
  const [reactionCount, setReactionCount] = useState(0)
  const containerRef = useRef<HTMLDivElement>(null)
  const animationRef = useRef<number>()

  // Send reaction mutation
  const sendReactionMutation = useMutation({
    mutationFn: async (emoji: string) => {
      await axios.post(`/api/posts/${postId}/reaction`, { emoji })
    }
  })

  // Animate reactions
  useEffect(() => {
    const animate = () => {
      setReactions(prev => {
        const now = Date.now()
        return prev
          .map(reaction => ({
            ...reaction,
            y: reaction.y - 2, // Move upward
            timestamp: reaction.timestamp
          }))
          .filter(reaction => now - reaction.timestamp < 3000) // Remove after 3 seconds
      })
      animationRef.current = requestAnimationFrame(animate)
    }
    
    animationRef.current = requestAnimationFrame(animate)
    
    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current)
      }
    }
  }, [])

  const addReaction = (emoji: string) => {
    const container = containerRef.current
    if (!container) return

    const rect = container.getBoundingClientRect()
    const newReaction: Reaction = {
      id: Math.random().toString(36).substr(2, 9),
      emoji,
      x: Math.random() * (rect.width - 40) + 20,
      y: rect.height - 40,
      timestamp: Date.now()
    }

    setReactions(prev => [...prev, newReaction])
    setReactionCount(prev => prev + 1)
    onReactionSent?.(emoji)
    
    // Send to server
    sendReactionMutation.mutate(emoji)
    
    setShowPicker(false)
  }

  // Auto-add reactions periodically for demo (remove in production)
  useEffect(() => {
    const interval = setInterval(() => {
      if (Math.random() > 0.7) { // 30% chance every 2 seconds
        const randomEmoji = AVAILABLE_REACTIONS[Math.floor(Math.random() * AVAILABLE_REACTIONS.length)]
        addReaction(randomEmoji)
      }
    }, 2000)

    return () => clearInterval(interval)
  }, [])

  return (
    <div ref={containerRef} className="relative w-full h-full pointer-events-none">
      {/* Floating Reactions */}
      {reactions.map(reaction => (
        <div
          key={reaction.id}
          className="absolute text-2xl animate-pulse pointer-events-none select-none"
          style={{
            left: `${reaction.x}px`,
            bottom: `${reaction.y}px`,
            transform: 'translateY(0)',
            animation: 'float-up 3s ease-out forwards'
          }}
        >
          {reaction.emoji}
        </div>
      ))}

      {/* Reaction Trigger Button */}
      <div className="absolute bottom-4 right-4 pointer-events-auto">
        <div className="relative">
          <button
            onClick={() => setShowPicker(!showPicker)}
            className="bg-white dark:bg-gray-800 rounded-full p-3 shadow-lg hover:shadow-xl transition-all duration-200 border border-gray-200 dark:border-gray-600"
            title="Add reaction"
          >
            <span className="text-xl">😊</span>
            {reactionCount > 0 && (
              <div className="absolute -top-2 -right-2 bg-red-500 text-white text-xs rounded-full min-w-[20px] h-5 flex items-center justify-center px-1">
                {reactionCount > 99 ? '99+' : reactionCount}
              </div>
            )}
          </button>

          {/* Reaction Picker */}
          {showPicker && (
            <div className="absolute bottom-full right-0 mb-2 bg-white dark:bg-gray-800 rounded-2xl p-3 shadow-xl border border-gray-200 dark:border-gray-600 min-w-[280px]">
              <div className="grid grid-cols-5 gap-2">
                {AVAILABLE_REACTIONS.map((emoji, index) => (
                  <button
                    key={index}
                    onClick={() => addReaction(emoji)}
                    className="text-2xl p-2 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors transform hover:scale-110 active:scale-95"
                  >
                    {emoji}
                  </button>
                ))}
              </div>
              
              {/* Quick reactions */}
              <div className="mt-3 pt-3 border-t border-gray-200 dark:border-gray-600">
                <p className="text-xs text-gray-500 dark:text-gray-400 mb-2">Quick reactions</p>
                <div className="flex space-x-2">
                  {['❤️', '😂', '👏', '🔥'].map(emoji => (
                    <button
                      key={emoji}
                      onClick={() => addReaction(emoji)}
                      className="text-xl p-2 bg-gray-100 dark:bg-gray-700 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
                    >
                      {emoji}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      <style>{`
        @keyframes float-up {
          0% {
            opacity: 1;
            transform: translateY(0) scale(1);
          }
          50% {
            opacity: 0.8;
            transform: translateY(-100px) scale(1.2);
          }
          100% {
            opacity: 0;
            transform: translateY(-200px) scale(0.5);
          }
        }
      `}</style>
    </div>
  )
}