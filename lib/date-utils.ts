export const formatDate = (date: string) => {
    return new Date(date).toLocaleDateString('fr-FR')
}
  
export const getDefaultDates = () => {
    const today = new Date()
    
    return {
        startDate: today.toISOString().split('T')[0],
        endDate: ''
    }
} 