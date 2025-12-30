'use client'

import { useRouter } from 'next/navigation'
import { ProductForm } from '@/components/product-form'
import { ArrowLeft, Plus, Sparkles, Package, ImageIcon } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useState, useEffect } from 'react'

export function NewProductPage() {
  const router = useRouter()
  const [isOpen, setIsOpen] = useState(true)
  const [isFormValid, setIsFormValid] = useState(false)
  const [productName, setProductName] = useState('')
  const [productImage, setProductImage] = useState<string | null>(null)
  const [productDescription, setProductDescription] = useState('')

  useEffect(() => {
    setIsOpen(true)
  }, [])

  const handleSuccess = () => {
    router.push('/dashboard/products')
    // Dispatch event to update product count in sidebar
    window.dispatchEvent(new CustomEvent('productsUpdated'))
  }

  const handleCancel = () => {
    router.push('/dashboard/products')
  }

  return (
    <div className="max-w-2xl mx-auto w-full">
      {/* Sticky Header */}
      <div className="sticky -top-4 z-20 bg-background pt-4 pb-6 mb-6">
        <div className="relative">
          {/* Back button - positioned outside form alignment */}
          <Button
            variant="ghost"
            size="icon"
            onClick={handleCancel}
            className="h-10 w-10 absolute -left-14 top-1/2 -translate-y-1/2"
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
          
          {/* Title and Save button - aligned with form */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              {/* Product Image Placeholder */}
              <div className="h-14 w-14 rounded-xl bg-gray-100 flex items-center justify-center overflow-hidden shrink-0 transition-all duration-300">
                {productImage ? (
                  <img 
                    src={productImage} 
                    alt={productName || 'Product'} 
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <ImageIcon className="h-6 w-6 text-gray-400" />
                )}
              </div>
              <div className="max-w-[375px]">
                <h1 className="text-2xl font-bold text-gray-900 transition-all duration-300 truncate">
                  {productName || 'Add New Product'}
                </h1>
                <p className="text-sm text-gray-500 mt-1 truncate">
                  {productDescription || (productName ? 'Configure your product details' : 'Create a new product for your store')}
                </p>
              </div>
            </div>
            <Button 
              type="submit" 
              form="product-form"
              disabled={!isFormValid}
              className="h-11 w-[160px] bg-gradient-to-r from-[#F4610B] to-[#FF8534] hover:from-[#E5550A] hover:to-[#F4610B] text-white font-semibold rounded-xl shadow-lg shadow-[#F4610B]/25 hover:shadow-xl hover:shadow-[#F4610B]/30 transition-all duration-200 hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100 disabled:shadow-none group"
            >
              <Sparkles className="h-4 w-4 mr-2 group-hover:animate-pulse" />
              Add Product
            </Button>
          </div>
        </div>
      </div>

      {/* Form Content */}
      <ProductForm
        open={true}
        onOpenChange={handleCancel}
        product={null}
        onSuccess={handleSuccess}
        asPage={true}
        onValidityChange={setIsFormValid}
        onProductNameChange={setProductName}
        onImageChange={setProductImage}
        onDescriptionChange={setProductDescription}
      />
    </div>
  )
}

