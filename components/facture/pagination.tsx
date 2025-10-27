'use client'
import { Button } from '@/components/ui/button'
import { ChevronLeft, ChevronRight } from 'lucide-react'

export default function Pagination({ totalPages, currentPage, setCurrentPage }: { totalPages: number, currentPage: number, setCurrentPage: (page: number) => void }) {
    return (
        <div className="p-4 border-t bg-white">
            <div className="flex justify-center gap-2">
              <Button
                variant="outline"
                size="icon"
                onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                className="hover:bg-primary-100 hover:text-primary-700 hover:border-primary-300 transition-colors"
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              {[...Array(totalPages)].map((_, i) => {
                // Afficher seulement quelques pages pour éviter l'encombrement
                if (i === 0 || i === totalPages - 1 || (i >= currentPage - 2 && i <= currentPage + 2)) {
                  return (
                    <Button
                      key={i + 1}
                      variant={currentPage === i + 1 ? "default" : "outline"}
                      size="icon"
                      onClick={() => setCurrentPage(i + 1)}
                      className={
                        currentPage === i + 1
                          ? "bg-primary hover:bg-primary-600"
                          : "hover:bg-primary-100 hover:text-primary-700 hover:border-primary-300 transition-colors"
                      }
                    >
                      {i + 1}
                    </Button>
                  )
                } else if ((i === 1 && currentPage > 3) || (i === totalPages - 2 && currentPage < totalPages - 3)) {
                  // Afficher des points de suspension
                  return (
                    <Button key={`ellipsis-${i}`} variant="outline" size="icon" disabled className="cursor-default">
                      ...
                    </Button>
                  )
                }
                return null
              })}
              <Button
                variant="outline"
                size="icon"
                onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
                className="hover:bg-primary-100 hover:text-primary-700 hover:border-primary-300 transition-colors"
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
        </div>
    )
}