'use client'

import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Keyboard, ScanBarcode, AlertCircle, Barcode } from "lucide-react"

interface ScanMainDialogProps {
    isOpen: boolean
    onOpenChange: (open: boolean) => void
    scannedValue: string
    onInputChange: (e: React.ChangeEvent<HTMLInputElement>) => void
    onKeyDown: (e: React.KeyboardEvent<HTMLInputElement>) => void
    onTestMode: () => void
    errorMessage: string
    loading: boolean
    isTestMode: boolean
    title: string
    description: string
    buttonText: string
    placeholder: string
    inputRef: React.RefObject<HTMLInputElement | null>
    children?: React.ReactNode
}

export default function ScanMainDialog({
    isOpen,
    onOpenChange,
    scannedValue,
    onInputChange,
    onKeyDown,
    onTestMode,
    errorMessage,
    loading,
    isTestMode,
    title,
    description,
    buttonText,
    placeholder,
    inputRef,
    children
}: ScanMainDialogProps) {
    return (
        <Dialog open={isOpen} onOpenChange={onOpenChange}>
            <DialogTrigger asChild>
                <Button
                    variant="outline"
                    className="hover:bg-primary-700 hover:text-white bg-primary-500 text-white transition-all duration-300"
                >
                    <ScanBarcode className="h-4 w-4 mr-2" />
                    {buttonText}
                </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[500px]">
                <DialogHeader>
                    <DialogTitle>{title}</DialogTitle>
                </DialogHeader>
                <div className="py-4 space-y-4">
                    <div className="space-y-2">
                        <Label htmlFor="scanner-input">Scannez le code-barres</Label>
                        <Input
                            ref={inputRef}
                            id="scanner-input"
                            value={scannedValue}
                            onChange={onInputChange}
                            autoFocus={true}
                            onKeyDown={onKeyDown}
                            className="text-center text-lg font-medium focus-visible:ring-blue-500"
                            placeholder={placeholder}
                        />
                        {errorMessage && (
                            <div className="flex items-center justify-center gap-2 text-sm text-red-500">
                                {errorMessage === "Cette facture n'existe pas" && (
                                    <AlertCircle className="h-4 w-4" />
                                )}
                                <span>{errorMessage}</span>
                            </div>
                        )}
                    </div>

                    <div className="text-sm text-gray-500 text-center">
                                <p>{description}</p>
                            </div>

                    {/* {children || (
                        <div className="space-y-4">
                            <div className="text-sm text-gray-500 text-center">
                                <p>{description}</p>
                            </div>
                            <Button
                                variant="outline"
                                onClick={onTestMode}
                                className="w-full"
                                disabled={true}
                            >
                                <Keyboard className="h-4 w-4 mr-2" />
                                Mode test (saisie manuelle)
                            </Button>
                        </div>
                    )} */}
                </div>
            </DialogContent>
        </Dialog>
    )
} 