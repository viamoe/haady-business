'use client'

import { useState, useEffect, useRef, useMemo } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Badge } from '@/components/ui/badge'
import { Switch } from '@/components/ui/switch'
import { Slider } from '@/components/ui/slider'
import { Progress } from '@/components/ui/progress'
import { Separator } from '@/components/ui/separator'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Checkbox } from '@/components/ui/checkbox'
import { Skeleton } from '@/components/ui/skeleton'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { toast } from '@/lib/toast'
import { motion } from 'framer-motion'
import { Play, Code, Zap, Palette, Layers, Sparkles, Building2 } from 'lucide-react'
import { Loader2, ChevronDown, CheckCircle2, Search } from 'lucide-react'
import { Flag } from '@/components/flag'
import { useLocale } from '@/i18n/context'

export const dynamic = 'force-dynamic'

interface Country {
  id: string
  name: string
  name_ar?: string
  iso2: string
  iso3?: string
  phone_code?: string
  flag_url?: string
}

interface StoreCategory {
  id: string
  name: string
  name_ar?: string
  slug?: string
  icon?: string
}

export default function DesignPage() {
  const { locale, isRTL } = useLocale()
  const [sliderValue, setSliderValue] = useState([50])
  const [progressValue, setProgressValue] = useState(33)
  const [switchChecked, setSwitchChecked] = useState(false)
  const [inputValue, setInputValue] = useState('')
  const [selectedValue, setSelectedValue] = useState('')
  const [isLoading, setIsLoading] = useState(false)

  // Haady components state
  const [countries, setCountries] = useState<Country[]>([])
  const [isLoadingCountries, setIsLoadingCountries] = useState(true)
  const [selectedCountry, setSelectedCountry] = useState<Country | null>(null)
  
  // Store Name input state
  const [isStoreNameArabic, setIsStoreNameArabic] = useState(locale === 'ar')
  const [storeName, setStoreName] = useState('')
  const [storeNameAr, setStoreNameAr] = useState('')
  const [focusedField, setFocusedField] = useState<string | null>(null)
  const storeNameInputRef = useRef<HTMLInputElement>(null)
  const storeNameArInputRef = useRef<HTMLInputElement>(null)
  
  // Store Categories state
  const [storeCategories, setStoreCategories] = useState<StoreCategory[]>([
    { id: '1', name: 'Fashion', name_ar: 'أزياء', icon: '👗' },
    { id: '2', name: 'Electronics', name_ar: 'إلكترونيات', icon: '📱' },
    { id: '3', name: 'Food & Beverage', name_ar: 'طعام ومشروبات', icon: '🍔' },
    { id: '4', name: 'Beauty', name_ar: 'جمال', icon: '💄' },
    { id: '5', name: 'Home & Garden', name_ar: 'منزل وحديقة', icon: '🏠' },
    { id: '6', name: 'Sports', name_ar: 'رياضة', icon: '⚽' },
  ])
  const [isLoadingStoreCategories, setIsLoadingStoreCategories] = useState(false)
  const [categorySearch, setCategorySearch] = useState('')
  const [storeCategory, setStoreCategory] = useState<string[]>([])
  const [isStoreCategoryOpen, setIsStoreCategoryOpen] = useState(false)
  
  // Filter categories based on search
  const filteredCategories = useMemo(() => {
    if (!categorySearch.trim()) return storeCategories
    
    const searchLower = categorySearch.toLowerCase().trim()
    return storeCategories.filter(cat => {
      const nameMatch = cat.name?.toLowerCase().includes(searchLower)
      const nameArMatch = cat.name_ar?.toLowerCase().includes(searchLower)
      return nameMatch || nameArMatch
    })
  }, [storeCategories, categorySearch])
  
  const selectedStoreCategories = storeCategories.filter(cat => storeCategory?.includes(cat.id))

  // Fetch countries
  useEffect(() => {
    const fetchCountries = async () => {
      try {
        const response = await fetch('/api/countries')
        
        if (!response.ok) {
          throw new Error(`Failed to fetch countries: ${response.statusText}`)
        }
        
        const responseData = await response.json()
        const countriesData = responseData.countries || []
        
        if (countriesData && countriesData.length > 0) {
          const validCountries = countriesData.filter((c: any) => {
            const hasId = c && c.id != null && String(c.id).trim() !== ''
            const hasName = c && c.name != null && String(c.name).trim() !== ''
            const hasIso2 = c && c.iso2 != null && String(c.iso2).trim() !== ''
            return hasId && hasName && hasIso2
          })
          
          setCountries(validCountries)
          
          // Set default country (Saudi Arabia)
          if (validCountries.length > 0) {
            const defaultCountry = validCountries.find((c: Country) => c.iso2 === 'SA') || validCountries[0]
            setSelectedCountry(defaultCountry)
          }
        } else {
          setCountries([])
        }
      } catch (error: any) {
        console.error('Error fetching countries:', error)
      } finally {
        setIsLoadingCountries(false)
      }
    }

    fetchCountries()
  }, [])

  const handleCountrySelect = (country: Country) => {
    setSelectedCountry(country)
  }

  const handleToast = (type: 'success' | 'error' | 'info' | 'warning') => {
    const messages = {
      success: { title: 'Success!', description: 'Operation completed successfully.' },
      error: { title: 'Error!', description: 'Something went wrong.' },
      info: { title: 'Info', description: 'Here is some information.' },
      warning: { title: 'Warning!', description: 'Please be careful.' },
    }
    toast[type](messages[type].title, {
      description: messages[type].description,
    })
  }

  const simulateLoading = () => {
    setIsLoading(true)
    setTimeout(() => {
      setIsLoading(false)
      toast.success('Loading complete!')
    }, 2000)
  }

  return (
    <div className="container mx-auto p-8 max-w-7xl">
      <div className="mb-8">
        <h1 className="text-4xl font-bold mb-2">Design System</h1>
        <p className="text-muted-foreground">
          Reference page for design components, patterns, and concepts
        </p>
      </div>

      <Tabs defaultValue="components" className="space-y-6">
        <TabsList className="grid w-full grid-cols-7">
          <TabsTrigger value="components">
            <Layers className="w-4 h-4 mr-2" />
            Components
          </TabsTrigger>
          <TabsTrigger value="forms">
            <Code className="w-4 h-4 mr-2" />
            Forms
          </TabsTrigger>
          <TabsTrigger value="animations">
            <Sparkles className="w-4 h-4 mr-2" />
            Animations
          </TabsTrigger>
          <TabsTrigger value="state">
            <Zap className="w-4 h-4 mr-2" />
            State
          </TabsTrigger>
          <TabsTrigger value="feedback">
            <Play className="w-4 h-4 mr-2" />
            Feedback
          </TabsTrigger>
          <TabsTrigger value="styling">
            <Palette className="w-4 h-4 mr-2" />
            Styling
          </TabsTrigger>
          <TabsTrigger value="haady">
            <Building2 className="w-4 h-4 mr-2" />
            Haady
          </TabsTrigger>
        </TabsList>

        {/* Components Tab */}
        <TabsContent value="components" className="space-y-6">
          <div className="grid gap-6 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>Buttons</CardTitle>
                <CardDescription>Different button variants and sizes</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex flex-wrap gap-2">
                  <Button variant="default">Default</Button>
                  <Button variant="secondary">Secondary</Button>
                  <Button variant="outline">Outline</Button>
                  <Button variant="ghost">Ghost</Button>
                  <Button variant="destructive">Destructive</Button>
                  <Button variant="link">Link</Button>
                </div>
                <Separator />
                <div className="flex flex-wrap gap-2">
                  <Button size="sm">Small</Button>
                  <Button size="default">Default</Button>
                  <Button size="lg">Large</Button>
                </div>
                <Separator />
                <div className="flex flex-wrap gap-2">
                  <Button disabled>Disabled</Button>
                  <Button variant="default" className="w-full">Full Width</Button>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Badges & Status</CardTitle>
                <CardDescription>Status indicators and labels</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex flex-wrap gap-2">
                  <Badge>Default</Badge>
                  <Badge variant="secondary">Secondary</Badge>
                  <Badge variant="outline">Outline</Badge>
                  <Badge variant="destructive">Destructive</Badge>
                </div>
                <Separator />
                <div className="flex items-center gap-4">
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-green-500" />
                    <span className="text-sm">Online</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-yellow-500" />
                    <span className="text-sm">Away</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-red-500" />
                    <span className="text-sm">Offline</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Dialogs</CardTitle>
                <CardDescription>Modal dialogs and alerts</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <Dialog>
                  <DialogTrigger asChild>
                    <Button variant="outline">Open Dialog</Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Dialog Example</DialogTitle>
                      <DialogDescription>
                        This is a sample dialog. You can add any content here.
                      </DialogDescription>
                    </DialogHeader>
                    <div className="py-4">
                      <p>Dialog content goes here...</p>
                    </div>
                  </DialogContent>
                </Dialog>

                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button variant="destructive">Open Alert</Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                      <AlertDialogDescription>
                        This action cannot be undone. This will permanently delete your data.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Cancel</AlertDialogCancel>
                      <AlertDialogAction>Continue</AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Loading States</CardTitle>
                <CardDescription>Skeletons and progress indicators</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Skeleton className="h-4 w-full" />
                  <Skeleton className="h-4 w-3/4" />
                  <Skeleton className="h-4 w-1/2" />
                </div>
                <Separator />
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <Skeleton className="h-12 w-12 rounded-full" />
                    <div className="space-y-2 flex-1">
                      <Skeleton className="h-4 w-full" />
                      <Skeleton className="h-4 w-2/3" />
                    </div>
                  </div>
                </div>
                <Separator />
                <Progress value={progressValue} className="w-full" />
                <div className="flex gap-2">
                  <Button size="sm" onClick={() => setProgressValue(Math.min(100, progressValue + 10))}>
                    Increase
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => setProgressValue(Math.max(0, progressValue - 10))}>
                    Decrease
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Forms Tab */}
        <TabsContent value="forms" className="space-y-6">
          <div className="grid gap-6 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>Form Inputs</CardTitle>
                <CardDescription>Input fields and controls</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="text-input">Text Input</Label>
                  <Input
                    id="text-input"
                    placeholder="Enter text..."
                    value={inputValue}
                    onChange={(e) => setInputValue(e.target.value)}
                  />
                  {inputValue && (
                    <p className="text-sm text-muted-foreground">Value: {inputValue}</p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="email-input">Email Input</Label>
                  <Input id="email-input" type="email" placeholder="email@example.com" />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="password-input">Password Input</Label>
                  <Input id="password-input" type="password" placeholder="••••••••" />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="select-input">Select</Label>
                  <Select value={selectedValue} onValueChange={setSelectedValue}>
                    <SelectTrigger id="select-input">
                      <SelectValue placeholder="Select an option" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="option1">Option 1</SelectItem>
                      <SelectItem value="option2">Option 2</SelectItem>
                      <SelectItem value="option3">Option 3</SelectItem>
                    </SelectContent>
                  </Select>
                  {selectedValue && (
                    <p className="text-sm text-muted-foreground">Selected: {selectedValue}</p>
                  )}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Form Controls</CardTitle>
                <CardDescription>Checkboxes, switches, and sliders</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="flex items-center space-x-2">
                  <Checkbox id="checkbox1" />
                  <Label htmlFor="checkbox1">Accept terms and conditions</Label>
                </div>

                <div className="flex items-center space-x-2">
                  <Checkbox id="checkbox2" defaultChecked />
                  <Label htmlFor="checkbox2">Subscribe to newsletter</Label>
                </div>

                <Separator />

                <div className="flex items-center justify-between">
                  <Label htmlFor="switch">Enable notifications</Label>
                  <Switch
                    id="switch"
                    checked={switchChecked}
                    onCheckedChange={setSwitchChecked}
                  />
                </div>
                {switchChecked && (
                  <p className="text-sm text-muted-foreground">Notifications are enabled</p>
                )}

                <Separator />

                <div className="space-y-2">
                  <div className="flex justify-between">
                    <Label>Volume</Label>
                    <span className="text-sm text-muted-foreground">{sliderValue[0]}%</span>
                  </div>
                  <Slider
                    value={sliderValue}
                    onValueChange={setSliderValue}
                    max={100}
                    step={1}
                  />
                </div>
              </CardContent>
            </Card>

            <Card className="md:col-span-2">
              <CardHeader>
                <CardTitle>Form Example</CardTitle>
                <CardDescription>Complete form with validation</CardDescription>
              </CardHeader>
              <CardContent>
                <form
                  onSubmit={(e) => {
                    e.preventDefault()
                    toast.success('Form submitted!')
                  }}
                  className="space-y-4"
                >
                  <div className="grid gap-4 md:grid-cols-2">
                    <div className="space-y-2">
                      <Label htmlFor="name">Name</Label>
                      <Input id="name" placeholder="John Doe" required />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="email">Email</Label>
                      <Input id="email" type="email" placeholder="john@example.com" required />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="message">Message</Label>
                    <Input id="message" placeholder="Your message..." />
                  </div>
                  <div className="flex items-center space-x-2">
                    <Checkbox id="agree" required />
                    <Label htmlFor="agree">I agree to the terms</Label>
                  </div>
                  <Button type="submit" className="w-full">Submit Form</Button>
                </form>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Animations Tab */}
        <TabsContent value="animations" className="space-y-6">
          <div className="grid gap-6 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>Framer Motion</CardTitle>
                <CardDescription>Animation examples</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.5 }}
                  className="p-4 bg-primary/10 rounded-lg"
                >
                  Fade in from bottom
                </motion.div>

                <motion.div
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  className="p-4 bg-secondary rounded-lg cursor-pointer"
                >
                  Hover and tap me!
                </motion.div>

                <motion.div
                  animate={{
                    rotate: [0, 360],
                  }}
                  transition={{
                    duration: 2,
                    repeat: Infinity,
                    ease: "linear",
                  }}
                  className="w-12 h-12 bg-primary rounded-lg mx-auto"
                />

                <motion.div
                  initial={{ x: -100 }}
                  animate={{ x: 0 }}
                  transition={{
                    type: "spring",
                    stiffness: 100,
                    damping: 10,
                  }}
                  className="p-4 bg-accent rounded-lg"
                >
                  Spring animation
                </motion.div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Interactive Animations</CardTitle>
                <CardDescription>Click to trigger animations</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  className="w-full p-4 bg-primary text-white rounded-lg hover:bg-orange-500 transition-colors"
                >
                  Animated Button
                </motion.button>

                <motion.div
                  className="grid grid-cols-3 gap-2"
                >
                  {[1, 2, 3, 4, 5, 6].map((i) => (
                    <motion.div
                      key={i}
                      initial={{ opacity: 0, scale: 0 }}
                      animate={{ opacity: 1, scale: 1 }}
                      transition={{ delay: i * 0.1 }}
                      className="aspect-square bg-primary/20 rounded-lg"
                    />
                  ))}
                </motion.div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* State Tab */}
        <TabsContent value="state" className="space-y-6">
          <div className="grid gap-6 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>State Management</CardTitle>
                <CardDescription>React state examples</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span>Counter</span>
                    <Badge variant="secondary">{progressValue}</Badge>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      onClick={() => setProgressValue(prev => prev + 1)}
                    >
                      Increment
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => setProgressValue(prev => prev - 1)}
                    >
                      Decrement
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => setProgressValue(0)}
                    >
                      Reset
                    </Button>
                  </div>
                </div>

                <Separator />

                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span>Toggle State</span>
                    <Badge variant={switchChecked ? "default" : "secondary"}>
                      {switchChecked ? "ON" : "OFF"}
                    </Badge>
                  </div>
                  <Button
                    onClick={() => setSwitchChecked(!switchChecked)}
                    variant="outline"
                    className="w-full"
                  >
                    Toggle Switch
                  </Button>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Async Operations</CardTitle>
                <CardDescription>Loading states and async handling</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <Button
                  onClick={simulateLoading}
                  disabled={isLoading}
                  className="w-full"
                >
                  {isLoading ? 'Loading...' : 'Simulate Async Operation'}
                </Button>

                {isLoading && (
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="space-y-2"
                  >
                    <Progress value={66} className="w-full" />
                    <p className="text-sm text-muted-foreground text-center">
                      Processing...
                    </p>
                  </motion.div>
                )}

                <Separator />

                <div className="space-y-2">
                  <Label>Input State</Label>
                  <Input
                    value={inputValue}
                    onChange={(e) => setInputValue(e.target.value)}
                    placeholder="Type to see state update..."
                  />
                  <p className="text-sm text-muted-foreground">
                    Character count: {inputValue.length}
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Feedback Tab */}
        <TabsContent value="feedback" className="space-y-6">
          <div className="grid gap-6 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>Toast Notifications</CardTitle>
                <CardDescription>Different toast types</CardDescription>
              </CardHeader>
              <CardContent className="space-y-2">
                <Button onClick={() => handleToast('success')} className="w-full">
                  Success Toast
                </Button>
                <Button onClick={() => handleToast('error')} variant="destructive" className="w-full">
                  Error Toast
                </Button>
                <Button onClick={() => handleToast('info')} variant="outline" className="w-full">
                  Info Toast
                </Button>
                <Button onClick={() => handleToast('warning')} variant="secondary" className="w-full">
                  Warning Toast
                </Button>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Progress Feedback</CardTitle>
                <CardDescription>Visual progress indicators</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span>Progress</span>
                    <span>{progressValue}%</span>
                  </div>
                  <Progress value={progressValue} />
                </div>
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    onClick={() => setProgressValue(Math.min(100, progressValue + 25))}
                    className="flex-1"
                  >
                    +25%
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => setProgressValue(Math.max(0, progressValue - 25))}
                    className="flex-1"
                  >
                    -25%
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Styling Tab */}
        <TabsContent value="styling" className="space-y-6">
          <div className="grid gap-6 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>Color Palette</CardTitle>
                <CardDescription>Theme colors and variants</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-4 gap-2">
                  <div className="aspect-square bg-primary rounded-lg" />
                  <div className="aspect-square bg-secondary rounded-lg" />
                  <div className="aspect-square bg-accent rounded-lg" />
                  <div className="aspect-square bg-destructive rounded-lg" />
                </div>
                <div className="grid grid-cols-4 gap-2">
                  <div className="aspect-square bg-muted rounded-lg" />
                  <div className="aspect-square bg-card rounded-lg border" />
                  <div className="aspect-square bg-popover rounded-lg border" />
                  <div className="aspect-square bg-background rounded-lg border" />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Spacing & Layout</CardTitle>
                <CardDescription>Grid and flex examples</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-3 gap-2">
                  {[1, 2, 3, 4, 5, 6].map((i) => (
                    <div key={i} className="aspect-square bg-primary/10 rounded-lg flex items-center justify-center">
                      {i}
                    </div>
                  ))}
                </div>
                <div className="flex gap-2">
                  <div className="flex-1 h-12 bg-primary/10 rounded-lg" />
                  <div className="flex-1 h-12 bg-primary/10 rounded-lg" />
                  <div className="flex-1 h-12 bg-primary/10 rounded-lg" />
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Haady Tab */}
        <TabsContent value="haady" className="space-y-6">
          <div className="space-y-8">
            {/* Country Dropdown Section */}
            <Card>
              <CardHeader>
                <CardTitle>Country Dropdown</CardTitle>
                <CardDescription>
                  A dropdown menu component for selecting countries with flag icons and bilingual support.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="space-y-2">
                  <Label htmlFor="country-example-1">Country</Label>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button
                        type="button"
                        variant="outline"
                        className="h-12 w-64 justify-between border border-gray-300 rounded-md shadow-xs bg-transparent hover:bg-transparent focus-visible:border-primary focus-visible:ring-primary/50 focus-visible:ring-[3px]"
                        disabled={isLoadingCountries}
                      >
                        <div className="flex items-center gap-2">
                          {isLoadingCountries ? (
                            <>
                              <Loader2 className="h-4 w-4 animate-spin text-gray-500" />
                              <span className="text-gray-500">Loading countries...</span>
                            </>
                          ) : selectedCountry ? (
                            <>
                              <Flag countryName={selectedCountry.name} flagUrl={selectedCountry.flag_url} size="s" />
                              <span>{locale === 'ar' && selectedCountry.name_ar ? selectedCountry.name_ar : selectedCountry.name}</span>
                            </>
                          ) : (
                            <span className="text-gray-500">Select your country</span>
                          )}
                        </div>
                        <ChevronDown className="h-4 w-4 opacity-50" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent className="w-[var(--radix-dropdown-menu-trigger-width)] rounded-xl overflow-hidden p-1 ml-2 max-h-[300px] overflow-y-auto">
                      {isLoadingCountries ? (
                        <DropdownMenuItem disabled>
                          <span className="text-gray-500">Loading countries...</span>
                        </DropdownMenuItem>
                      ) : countries.length === 0 ? (
                        <DropdownMenuItem disabled>
                          <span className="text-gray-500">No countries available</span>
                        </DropdownMenuItem>
                      ) : (
                        countries.map((country) => {
                          if (!country || !country.id || !country.name) {
                            return null
                          }
                          return (
                            <DropdownMenuItem
                              key={country.id}
                              onClick={() => handleCountrySelect(country)}
                              className="cursor-pointer rounded-lg h-10"
                            >
                              <Flag countryName={country.name} flagUrl={country.flag_url} size="s" rounded={false} />
                              <span>{locale === 'ar' && country.name_ar ? country.name_ar : country.name}</span>
                            </DropdownMenuItem>
                          )
                        }).filter(Boolean)
                      )}
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </CardContent>
            </Card>

            {/* Store Name Input with EN/AR Toggle Section */}
            <Card>
              <CardHeader>
                <CardTitle>Store Name Input with EN/AR Toggle</CardTitle>
                <CardDescription>
                  A bilingual input field with language toggle switch and real-time validation checklist. Supports separate English and Arabic values with keyboard language switching.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label htmlFor={isStoreNameArabic ? 'storeNameAr-demo' : 'storeName-demo'} className={focusedField === 'storeName' || focusedField === 'storeNameAr' ? 'text-[#F4610B]' : ''}>
                      Store Name
                    </Label>
                    <div className="flex items-center gap-2">
                      <span className={`text-xs font-medium ${!isStoreNameArabic ? 'text-[#F4610B]' : 'text-gray-500'}`}>
                        EN
                      </span>
                      <Switch
                        checked={isStoreNameArabic}
                        onCheckedChange={setIsStoreNameArabic}
                        className="data-[state=checked]:bg-[#F4610B]"
                        dir={isRTL ? 'rtl' : 'ltr'}
                      />
                      <span className={`text-xs font-medium ${isStoreNameArabic ? 'text-[#F4610B]' : 'text-gray-500'}`}>
                        AR
                      </span>
                    </div>
                  </div>
                  {!isStoreNameArabic ? (
                    <Input
                      ref={storeNameInputRef}
                      id="storeName-demo"
                      name="storeName"
                      value={storeName || ''}
                      placeholder="Your store name"
                      lang="en"
                      inputMode="text"
                      autoComplete="off"
                      spellCheck={false}
                      onFocus={() => setFocusedField('storeName')}
                      onBlur={() => setFocusedField(null)}
                      onChange={(e) => setStoreName(e.target.value)}
                      className="h-12 hover:!border-orange-500 hover:!ring-1 hover:!ring-orange-500 focus-visible:!ring-1 focus-visible:!ring-orange-500 focus-visible:!border-orange-500 !border-gray-300"
                      dir="ltr"
                    />
                  ) : (
                    <Input
                      ref={storeNameArInputRef}
                      id="storeNameAr-demo"
                      name="storeNameAr"
                      value={storeNameAr || ''}
                      placeholder={locale === 'ar' ? 'اسم متجرك بالعربية' : 'Your store name in Arabic'}
                      lang="ar"
                      inputMode="text"
                      autoComplete="off"
                      spellCheck={false}
                      onFocus={() => setFocusedField('storeNameAr')}
                      onBlur={() => setFocusedField(null)}
                      onChange={(e) => setStoreNameAr(e.target.value)}
                      className="h-12 hover:!border-orange-500 hover:!ring-1 hover:!ring-orange-500 focus-visible:!ring-1 focus-visible:!ring-orange-500 focus-visible:!border-orange-500 !border-gray-300"
                      dir="rtl"
                    />
                  )}
                  
                  {/* Checklist */}
                  <div className={`flex ${isRTL ? 'flex-row-reverse' : 'flex-row'} items-center gap-4 mt-2 flex-wrap`}>
                    <div className={`flex items-center gap-2 text-xs ${storeName && storeName.trim().length >= 2 ? 'text-green-600' : 'text-red-500'}`}>
                      {storeName && storeName.trim().length >= 2 ? (
                        <CheckCircle2 className="h-4 w-4 text-green-600" />
                      ) : (
                        <div className="h-4 w-4 rounded-full border-2 border-red-500" />
                      )}
                      <span>{locale === 'ar' ? 'اسم المتجر بالإنجليزية' : 'English store name'}</span>
                    </div>
                    <div className={`flex items-center gap-2 text-xs ${storeNameAr && storeNameAr.trim().length >= 2 ? 'text-green-600' : 'text-red-500'}`}>
                      {storeNameAr && storeNameAr.trim().length >= 2 ? (
                        <CheckCircle2 className="h-4 w-4 text-green-600" />
                      ) : (
                        <div className="h-4 w-4 rounded-full border-2 border-red-500" />
                      )}
                      <span>{locale === 'ar' ? 'اسم المتجر بالعربية' : 'Arabic store name'}</span>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Store Categories Multi-Select Dropdown Section */}
            <Card>
              <CardHeader>
                <CardTitle>Store Categories Multi-Select</CardTitle>
                <CardDescription>
                  A multi-select dropdown with search functionality, selection counter, and maximum selection limit (3). Shows selected categories as badges in the trigger button.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="space-y-2">
                  <Label htmlFor="storeCategory-demo" className={isStoreCategoryOpen ? 'text-[#F4610B]' : ''}>
                    Store Categories
                  </Label>
                  <DropdownMenu open={isStoreCategoryOpen} onOpenChange={setIsStoreCategoryOpen}>
                    <DropdownMenuTrigger asChild>
                      <Button
                        type="button"
                        variant="outline"
                        className={`h-12 w-full justify-between rounded-md shadow-xs bg-transparent hover:bg-transparent border-[1px] hover:!border-orange-500 hover:!ring-1 hover:!ring-orange-500 focus-visible:!ring-1 focus-visible:!ring-orange-500 focus-visible:!border-orange-500 ${isStoreCategoryOpen ? '!border-orange-500 !ring-1 !ring-orange-500' : ''} !border-gray-300`}
                        disabled={isLoadingStoreCategories}
                      >
                        <div className="flex items-center gap-2 flex-1 min-w-0 overflow-hidden">
                          {isLoadingStoreCategories ? (
                            <>
                              <Loader2 className="h-4 w-4 animate-spin text-gray-500" />
                              <span className="text-gray-500">Loading...</span>
                            </>
                          ) : selectedStoreCategories.length > 0 ? (
                            <div className="flex items-center gap-1.5 flex-wrap min-w-0 flex-1">
                              {selectedStoreCategories.slice(0, 3).map((cat) => (
                                <span key={cat.id} className="inline-flex items-center gap-1 px-2 py-1 bg-orange-50 rounded-md text-sm text-[#F4610B] font-medium min-w-0 max-w-[30%]">
                                  {cat.icon && <span className="text-sm flex-shrink-0">{cat.icon}</span>}
                                  <span className="truncate">{locale === 'ar' && cat.name_ar ? cat.name_ar : cat.name}</span>
                                </span>
                              ))}
                            </div>
                          ) : (
                            <span className="text-gray-500">Select categories</span>
                          )}
                        </div>
                        <ChevronDown className="h-4 w-4 opacity-50" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent className="w-[var(--radix-dropdown-menu-trigger-width)] rounded-xl overflow-hidden p-0" align={isRTL ? 'end' : 'start'}>
                      {/* Search Input */}
                      <div className="p-2 border-b border-gray-200 sticky top-0 bg-white z-10 space-y-2">
                        <div className="relative">
                          <Search className={`absolute ${isRTL ? 'right-3' : 'left-3'} top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400`} />
                          <Input
                            type="text"
                            placeholder={locale === 'ar' ? 'بحث...' : 'Search...'}
                            value={categorySearch}
                            onChange={(e) => setCategorySearch(e.target.value)}
                            className={`h-9 ${isRTL ? 'pr-9 text-right' : 'pl-9'} text-sm !border-gray-300 hover:!border-orange-500 hover:!ring-1 hover:!ring-orange-500 focus-visible:!ring-1 focus-visible:!ring-orange-500 focus-visible:!border-orange-500`}
                            dir={isRTL ? 'rtl' : 'ltr'}
                          />
                        </div>
                        {/* Selection Counter */}
                        {(storeCategory?.length || 0) > 0 && (
                          <div className={`text-xs ${isRTL ? 'text-right' : 'text-left'}`}>
                            <span className="text-[#F4610B] font-medium">
                              {locale === 'ar' ? `${storeCategory?.length || 0} من 3 محددة` : `${storeCategory?.length || 0} of 3 selected`}
                            </span>
                          </div>
                        )}
                      </div>

                      {/* Categories List */}
                      <div className="max-h-[300px] overflow-y-auto p-1 scrollbar-minimal">
                        {isLoadingStoreCategories ? (
                          <div className="flex items-center justify-center py-8">
                            <Loader2 className="h-5 w-5 animate-spin text-gray-500" />
                          </div>
                        ) : filteredCategories.length === 0 ? (
                          <div className="py-8 text-center text-sm text-gray-500">
                            {categorySearch ? (locale === 'ar' ? 'لا توجد نتائج' : 'No results found') : (locale === 'ar' ? 'لا توجد فئات متاحة' : 'No categories available')}
                          </div>
                        ) : (
                          filteredCategories.map((category) => {
                            const isSelected = storeCategory?.includes(category.id) || false
                            const isMaxReached = (storeCategory?.length || 0) >= 3 && !isSelected
                            return (
                              <DropdownMenuItem
                                key={category.id}
                                onClick={(e) => {
                                  e.preventDefault()
                                  const currentCategories = storeCategory || []
                                  
                                  // If trying to add and already at max (3), show toast and return
                                  if (!isSelected && currentCategories.length >= 3) {
                                    toast.error('Maximum Selection', {
                                      description: locale === 'ar' ? 'يمكنك اختيار 3 فئات كحد أقصى' : 'You can select up to 3 categories maximum',
                                      duration: 3000,
                                    })
                                    return
                                  }
                                  
                                  const newCategories = isSelected
                                    ? currentCategories.filter(id => id !== category.id)
                                    : [...currentCategories, category.id]
                                  setStoreCategory(newCategories)
                                }}
                                className={`cursor-pointer rounded-lg h-10 flex items-center gap-2 mb-1 ${isRTL ? 'flex-row-reverse' : ''} ${isMaxReached ? 'opacity-50 cursor-not-allowed' : ''} ${isSelected ? '!bg-orange-100' : 'hover:!bg-orange-50 focus:!bg-orange-50'}`}
                                disabled={isMaxReached}
                              >
                                <Checkbox
                                  checked={isSelected}
                                  disabled={isMaxReached}
                                  className="h-4 w-4 data-[state=checked]:bg-[#F4610B] data-[state=checked]:border-[#F4610B] focus-visible:ring-[#F4610B]/50 focus-visible:border-[#F4610B]"
                                  onCheckedChange={() => {}}
                                />
                                {category.icon && <span className="text-lg">{category.icon}</span>}
                                <span className={`flex-1 ${isRTL ? 'text-right' : ''}`}>
                                  {locale === 'ar' && category.name_ar ? category.name_ar : category.name}
                                </span>
                              </DropdownMenuItem>
                            )
                          })
                        )}
                      </div>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  )
}
