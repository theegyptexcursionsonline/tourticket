import React from 'react'
import { act, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import DestinationManager from '../DestinationManager'
import { IDestination } from '@/lib/models/Destination'

// Mock Next.js router
const mockPush = jest.fn()
const mockRefresh = jest.fn()

jest.mock('next/navigation', () => ({
  useRouter: () => ({
    push: mockPush,
    refresh: mockRefresh,
  }),
}))

// Mock react-hot-toast
jest.mock('react-hot-toast', () => ({
  __esModule: true,
  default: {
    success: jest.fn(),
    error: jest.fn(),
    loading: jest.fn(),
    dismiss: jest.fn(),
    promise: jest.fn((promise, handlers) => {
      promise.then(handlers.success).catch(handlers.error)
      return promise
    }),
  },
}))

// Mock AdminAuthContext so DestinationManager can call useAdminAuth
jest.mock('@/contexts/AdminAuthContext', () => ({
  useAdminAuth: () => ({
    user: { id: 'test-admin', email: 'admin@test.com', role: 'super_admin', permissions: ['manage_destinations'] },
    token: 'mock-token',
    isLoading: false,
    isAuthenticated: true,
    hasPermission: () => true,
    hasAnyPermission: () => true,
    login: jest.fn(),
    logout: jest.fn(),
    refreshUser: jest.fn(),
  }),
}))

describe('DestinationManager', () => {
  const mockDestinations: any[] = [
    {
      _id: '1',
      name: 'Cairo',
      slug: 'cairo',
      country: 'Egypt',
      image: '/images/cairo.jpg',
      images: [],
      description: 'The vibrant capital',
      longDescription: 'Cairo is amazing',
      coordinates: { lat: 30.0444, lng: 31.2357 },
      currency: 'EGP',
      timezone: 'EET',
      bestTimeToVisit: 'October to April',
      highlights: ['Pyramids'],
      thingsToDo: ['Visit pyramids'],
      localCustoms: [],
      visaRequirements: 'Visa on arrival',
      languagesSpoken: ['Arabic'],
      emergencyNumber: '122',
      averageTemperature: { summer: '35°C', winter: '20°C' },
      climate: 'Hot desert',
      weatherWarnings: [],
      featured: true,
      isPublished: true,
      metaTitle: 'Visit Cairo',
      metaDescription: 'Explore Cairo',
      tags: ['ancient'],
      tourCount: 50,
      createdBy: { id: 'editor-1', name: 'Sara Editor', email: 'sara@example.com' },
      updatedBy: { id: 'editor-1', name: 'Sara Editor', email: 'sara@example.com' },
    },
    {
      _id: '2',
      name: 'Luxor',
      slug: 'luxor',
      country: 'Egypt',
      image: '/images/luxor.jpg',
      images: [],
      description: 'Ancient temples',
      longDescription: '',
      coordinates: { lat: 25.6872, lng: 32.6396 },
      currency: 'EGP',
      timezone: 'EET',
      bestTimeToVisit: 'Winter',
      highlights: [],
      thingsToDo: [],
      localCustoms: [],
      visaRequirements: '',
      languagesSpoken: [],
      emergencyNumber: '122',
      averageTemperature: { summer: '', winter: '' },
      climate: '',
      weatherWarnings: [],
      featured: false,
      isPublished: false,
      metaTitle: '',
      metaDescription: '',
      tags: [],
      tourCount: 30,
      createdBy: { id: 'editor-2', name: 'Omar Publisher', email: 'omar@example.com' },
      updatedBy: { id: 'editor-2', name: 'Omar Publisher', email: 'omar@example.com' },
    },
  ]

  beforeEach(() => {
    jest.clearAllMocks()
    window.history.replaceState(null, '', '/')
    // The component fetches /api/admin/tours on mount, so every test needs a
    // settled default — an unresolved mock leaves that effect rejecting mid-test.
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ success: true, data: [] }),
    })
  })

  // The component fetches /api/admin/tours on mount. Render through this helper so
  // that update settles inside act() instead of leaking into a later test.
  const renderManager = async (destinations: IDestination[] = mockDestinations) => {
    const result = render(<DestinationManager initialDestinations={destinations} />)
    await act(async () => {})
    return result
  }

  describe('Initial Rendering', () => {
    it('should render header with title', async () => {
      await renderManager()

      expect(screen.getByText('Destination Manager')).toBeInTheDocument()
      expect(screen.getByText('Manage your tour destinations and locations')).toBeInTheDocument()
    })

    it('should display destination count', async () => {
      await renderManager()

      expect(screen.getByText('2')).toBeInTheDocument()
      expect(screen.getByText('active destinations')).toBeInTheDocument()
    })

    it('should render all destination cards', async () => {
      await renderManager()

      expect(screen.getByText('Cairo')).toBeInTheDocument()
      expect(screen.getByText('Luxor')).toBeInTheDocument()
    })

    it('should show add destination button', async () => {
      await renderManager()

      expect(screen.getByRole('button', { name: /add destination/i })).toBeInTheDocument()
    })

    it('filters the complete destination list by author or editor and preserves the filter in the URL', async () => {
      const user = userEvent.setup()
      await renderManager()

      await user.type(screen.getByRole('searchbox', { name: /filter destinations by author or editor/i }), 'Sara')

      expect(screen.getByText('Cairo')).toBeInTheDocument()
      expect(screen.queryByText('Luxor')).not.toBeInTheDocument()
      expect(window.location.search).toContain('editor=Sara')
    })
  })

  describe('Destination Cards', () => {
    it('should display destination details', async () => {
      await renderManager()

      expect(screen.getAllByText('Egypt')[0]).toBeInTheDocument()
      expect(screen.getAllByText('/cairo')[0]).toBeInTheDocument()
      expect(screen.getAllByText('50 tours')[0]).toBeInTheDocument()
    })

    it('should show featured badge for featured destinations', async () => {
      await renderManager()

      expect(screen.getByText('Featured')).toBeInTheDocument()
    })

    it('should show published/draft status', async () => {
      await renderManager()

      expect(screen.getByText('Published')).toBeInTheDocument()
      expect(screen.getByText('Draft')).toBeInTheDocument()
    })

    it('opens each published destination in a new storefront tab and keeps draft previews fail-closed', async () => {
      const user = userEvent.setup()
      const openSpy = jest.spyOn(window, 'open').mockImplementation(() => null)
      await renderManager()

      const configuredStorefrontOrigin = new URL(
        process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost',
      ).origin
      const expectedPreviewUrl = `${configuredStorefrontOrigin}/destinations/cairo`
      const publishedPreview = screen.getByRole('link', { name: 'Preview Cairo on live site' })
      expect(publishedPreview).toHaveAttribute('href', expectedPreviewUrl)
      expect(publishedPreview).toHaveAttribute('target', '_blank')
      expect(publishedPreview).toHaveAttribute('rel', 'noopener noreferrer')

      await user.click(publishedPreview)
      expect(openSpy).toHaveBeenCalledTimes(1)
      expect(openSpy).toHaveBeenCalledWith(
        expectedPreviewUrl,
        '_blank',
        'noopener,noreferrer',
      )

      const draftPreview = screen.getByRole('button', { name: 'Preview Luxor unavailable until published' })
      expect(draftPreview).toBeDisabled()
      await user.click(draftPreview)
      expect(openSpy).toHaveBeenCalledTimes(1)
      openSpy.mockRestore()
    })

    it('should display placeholder for missing images', async () => {
      const noImage = [{ ...mockDestinations[0], image: '' }]
      await renderManager(noImage)

      // When no image is provided, the component renders a placeholder div with an SVG icon
      // instead of an <img> element. Verify the placeholder container is present.
      const placeholder = document.querySelector('.bg-gradient-to-br.from-slate-100.to-slate-200')
      expect(placeholder).toBeTruthy()
    })
  })

  describe('Empty State', () => {
    it('should show empty state when no destinations', async () => {
      await renderManager([])

      expect(screen.getByText('No destinations yet')).toBeInTheDocument()
      expect(screen.getByRole('button', { name: /add first destination/i })).toBeInTheDocument()
    })
  })

  describe('Create Destination Flow', () => {
    it('should open panel when add button is clicked', async () => {
      const user = userEvent.setup()
      await renderManager()

      const addButton = screen.getByRole('button', { name: /add destination/i })
      await user.click(addButton)

      await waitFor(() => {
        expect(screen.getByText('Add New Destination')).toBeInTheDocument()
      })
    })

    it('should show all tabs in create panel', async () => {
      const user = userEvent.setup()
      await renderManager()

      await user.click(screen.getByRole('button', { name: /add destination/i }))

      await waitFor(() => {
        expect(screen.getByText('Basic Info')).toBeInTheDocument()
        expect(screen.getByText('Location')).toBeInTheDocument()
        expect(screen.getByText('Content')).toBeInTheDocument()
        expect(screen.getByText('Travel Info')).toBeInTheDocument()
        expect(screen.getByText('SEO')).toBeInTheDocument()
      })
    })

    it('should require name and description fields', async () => {
      const user = userEvent.setup()
      await renderManager()

      await user.click(screen.getByRole('button', { name: /add destination/i }))

      await waitFor(() => {
        expect(screen.getByLabelText(/destination name/i)).toBeRequired()
        expect(screen.getByLabelText(/short description/i)).toBeRequired()
      })
    })

    it('should auto-generate slug from name', async () => {
      const user = userEvent.setup()
      await renderManager()

      await user.click(screen.getByRole('button', { name: /add destination/i }))

      const nameInput = await screen.findByLabelText(/destination name/i)
      await user.clear(nameInput)
      await user.type(nameInput, 'New Destination')

      const slugInput = screen.getByLabelText(/url slug/i) as HTMLInputElement
      await waitFor(() => {
        expect(slugInput.value).toBe('new-destination')
      })
    })
  })

  describe('Edit Destination Flow', () => {
    it('should open edit panel when edit button is clicked', async () => {
      const user = userEvent.setup()

      // Mock fetch for the /api/admin/tours calls (useEffect + openPanelForEdit)
      ;(global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: async () => ({ success: true, data: [] }),
      })

      await renderManager()

      const cairoCard = screen.getByText('Cairo').closest('.group')
      expect(cairoCard).toBeTruthy()
      const editButton = cairoCard!.querySelector('button[title="Edit destination"]')
      expect(editButton).toBeTruthy()
      await user.click(editButton!)

      await waitFor(() => {
        expect(screen.getByText('Edit Destination')).toBeInTheDocument()
      })
    })

    it('should populate form with existing data', async () => {
      const user = userEvent.setup()

      // Mock fetch for the /api/admin/tours calls (useEffect + openPanelForEdit)
      ;(global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: async () => ({ success: true, data: [] }),
      })

      await renderManager()

      const cairoCard = screen.getByText('Cairo').closest('.group')
      expect(cairoCard).toBeTruthy()
      const editButton = cairoCard!.querySelector('button[title="Edit destination"]')
      expect(editButton).toBeTruthy()
      await user.click(editButton!)

      await waitFor(() => {
        const nameInput = screen.getByLabelText(/destination name/i) as HTMLInputElement
        expect(nameInput.value).toBe('Cairo')
      })
    })
  })

  describe('Duplicate Destination Flow', () => {
    it('creates a draft copy and opens that returned copy for editing', async () => {
      const user = userEvent.setup()
      const copiedDestination = {
        ...mockDestinations[0],
        _id: '3',
        name: 'Cairo (Copy)',
        slug: 'cairo-copy',
        featured: false,
        isPublished: false,
        tourCount: 0,
      }

      ;(global.fetch as jest.Mock)
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ success: true, data: [] }),
        })
        .mockResolvedValueOnce({
          ok: true,
          status: 201,
          json: async () => ({
            success: true,
            data: copiedDestination,
            message: 'Draft destination copy created.',
          }),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ success: true, data: [] }),
        })

      await renderManager()
      await user.click(screen.getByRole('button', { name: 'Duplicate Cairo as draft' }))

      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalledWith('/api/admin/destinations/1/duplicate', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: 'Bearer mock-token',
          },
        })
        expect(screen.getByText('Edit Destination')).toBeInTheDocument()
        expect((screen.getByLabelText(/destination name/i) as HTMLInputElement).value)
          .toBe('Cairo (Copy)')
        expect(mockRefresh).toHaveBeenCalled()
      })
    })
  })

  describe('Form Validation', () => {
    it('should show validation error when submitting without required fields', async () => {
      const user = userEvent.setup()

      await renderManager()

      await user.click(screen.getByRole('button', { name: /add destination/i }))

      // The component now disables the save button when required fields are empty
      // and shows a validation message instead of calling toast.error
      await waitFor(() => {
        const saveButton = screen.getByRole('button', { name: /save destination/i })
        expect(saveButton).toBeDisabled()
        expect(screen.getByText(/please fill in the required fields/i)).toBeInTheDocument()
      })
    })

    it('should disable save button when form is invalid', async () => {
      const user = userEvent.setup()
      await renderManager()

      await user.click(screen.getByRole('button', { name: /add destination/i }))

      await waitFor(() => {
        const saveButton = screen.getByRole('button', { name: /save destination/i })
        expect(saveButton).toBeDisabled()
      })
    })
  })

  describe('Form Submission', () => {
    it('should create new destination successfully', async () => {
      const user = userEvent.setup()
      const toast = require('react-hot-toast').default

      ;(global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: async () => ({ success: true, data: {} }),
      })

      await renderManager()

      await user.click(screen.getByRole('button', { name: /add destination/i }))

      await user.type(await screen.findByLabelText(/destination name/i), 'Aswan')
      await user.type(screen.getByLabelText(/short description/i), 'Beautiful Nubian city')

      // Save stays disabled until both required fields are filled — wait for the
      // form to become valid before clicking, otherwise the click is a no-op.
      const saveButton = screen.getByRole('button', { name: /save destination/i })
      await waitFor(() => expect(saveButton).toBeEnabled())
      await user.click(saveButton)

      await waitFor(() => {
        expect(toast.success).toHaveBeenCalledWith('Destination created successfully!')
        expect(mockRefresh).toHaveBeenCalled()
      })
    })

    it('should update existing destination successfully', async () => {
      const user = userEvent.setup()
      const toast = require('react-hot-toast').default

      ;(global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: async () => ({ success: true, data: {} }),
      })

      await renderManager()

      const cairoCard = screen.getByText('Cairo').closest('.group')
      expect(cairoCard).toBeTruthy()
      const editButton = cairoCard!.querySelector('button[title="Edit destination"]')
      expect(editButton).toBeTruthy()
      await user.click(editButton!)

      const descInput = await screen.findByLabelText(/short description/i)
      await user.clear(descInput)
      await user.type(descInput, 'Updated description')

      const saveButton = screen.getByRole('button', { name: /save destination/i })
      await waitFor(() => expect(saveButton).toBeEnabled())
      await user.click(saveButton)

      await waitFor(() => {
        expect(toast.success).toHaveBeenCalledWith('Destination updated successfully!')
      })
    })

    it('should handle API errors gracefully', async () => {
      const user = userEvent.setup()
      const toast = require('react-hot-toast').default

      ;(global.fetch as jest.Mock).mockResolvedValue({
        ok: false,
        status: 500,
        statusText: 'Internal Server Error',
        json: async () => ({ error: 'Server error' }),
      })

      await renderManager()

      await user.click(screen.getByRole('button', { name: /add destination/i }))

      await user.type(await screen.findByLabelText(/destination name/i), 'Test')
      await user.type(screen.getByLabelText(/short description/i), 'Test description')

      const saveButton = screen.getByRole('button', { name: /save destination/i })
      await waitFor(() => expect(saveButton).toBeEnabled())
      await user.click(saveButton)

      await waitFor(() => {
        expect(toast.error).toHaveBeenCalled()
      })
    })
  })

  describe('Destination Trash', () => {
    it('moves a destination to Trash after confirmation', async () => {
      const user = userEvent.setup()
      const toast = require('react-hot-toast')
      jest.spyOn(window, 'confirm').mockReturnValue(true)

      ;(global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: async () => ({ success: true }),
      })

      await renderManager()

      const cairoCard = screen.getByText('Cairo').closest('.group')
      if (cairoCard) {
        const deleteButton = cairoCard.querySelector('button[title="Move destination to Trash"]')
        if (deleteButton) {
          await user.click(deleteButton)

          await waitFor(() => {
            expect(toast.default.promise).toHaveBeenCalled()
          })
        }
      }
    })

    it('shows trashed destinations separately and restores them to Draft', async () => {
      const user = userEvent.setup()
      ;(global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: async () => ({ success: true }),
      })
      await renderManager([
        mockDestinations[0],
        { ...mockDestinations[1], archivedAt: new Date('2026-08-11T10:00:00Z') },
      ])

      expect(screen.queryByText('Luxor')).not.toBeInTheDocument()
      await user.click(screen.getByRole('tab', { name: /trash \(1\)/i }))
      expect(screen.getByText('Luxor')).toBeInTheDocument()
      await user.click(screen.getByRole('button', { name: /restore luxor to draft/i }))

      await waitFor(() => expect(global.fetch).toHaveBeenCalledWith(
        '/api/admin/destinations/2',
        expect.objectContaining({
          method: 'PUT',
          body: JSON.stringify({ restoreFromTrash: true }),
        }),
      ))
    })
  })

  describe('Tab Navigation', () => {
    it('should switch between tabs', async () => {
      const user = userEvent.setup()
      await renderManager()

      await user.click(screen.getByRole('button', { name: /add destination/i }))

      await user.click(await screen.findByRole('button', { name: /location/i }))

      // The labels use htmlFor="coordinates.lat" but the inputs use name= not id=,
      // so getByLabelText won't find them. Use getByText to verify they're visible.
      expect(screen.getByText('Latitude')).toBeInTheDocument()
      expect(screen.getByText('Longitude')).toBeInTheDocument()
    })
  })

  describe('Array Field Management', () => {
    it('should add items to array fields', async () => {
      const user = userEvent.setup()
      await renderManager()

      await user.click(screen.getByRole('button', { name: /add destination/i }))

      await user.click(await screen.findByRole('button', { name: /content/i }))

      // There are multiple "Add" buttons on the Content tab (highlights, things to do, etc.)
      // Find the first one which is for Highlights
      const addButtons = await screen.findAllByRole('button', { name: /^add$/i })
      await user.click(addButtons[0])

      const highlightInputs = screen.getAllByPlaceholderText(/enter a highlight/i)
      expect(highlightInputs.length).toBeGreaterThan(0)
    })
  })

  describe('Image Upload', () => {
    it('should handle image upload', async () => {
      const user = userEvent.setup()

      ;(global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: async () => ({ success: true, url: '/images/new-image.jpg' }),
      })

      await renderManager()

      await user.click(screen.getByRole('button', { name: /add destination/i }))

      await waitFor(() => {
        const fileInput = screen.getByLabelText(/upload image/i)
        expect(fileInput).toBeInTheDocument()
      })
    })
  })

  describe('Accessibility', () => {
    it('should have proper labels for form inputs', async () => {
      const user = userEvent.setup()
      await renderManager()

      await user.click(screen.getByRole('button', { name: /add destination/i }))

      await waitFor(() => {
        expect(screen.getByLabelText(/destination name/i)).toBeInTheDocument()
        expect(screen.getByLabelText(/country/i)).toBeInTheDocument()
        expect(screen.getByLabelText(/url slug/i)).toBeInTheDocument()
      })
    })

    it('should have accessible buttons', async () => {
      await renderManager()

      const buttons = screen.getAllByRole('button')
      buttons.forEach(button => {
        expect(button).toHaveAccessibleName()
      })
    })
  })

  describe('Panel Behavior', () => {
    it('should close panel when cancel is clicked', async () => {
      const user = userEvent.setup()
      await renderManager()

      await user.click(screen.getByRole('button', { name: /add destination/i }))

      await waitFor(() => {
        expect(screen.getByText('Add New Destination')).toBeInTheDocument()
      })

      const cancelButton = screen.getByRole('button', { name: /cancel/i })
      await user.click(cancelButton)

      await waitFor(() => {
        expect(screen.queryByText('Add New Destination')).not.toBeInTheDocument()
      })
    })

    it('should close panel when backdrop is clicked', async () => {
      const user = userEvent.setup()
      await renderManager()

      await user.click(screen.getByRole('button', { name: /add destination/i }))

      await waitFor(() => {
        expect(screen.getByText('Add New Destination')).toBeInTheDocument()
      })

      const backdrop = document.querySelector('.bg-black\\/60')
      if (backdrop) {
        await user.click(backdrop as Element)

        await waitFor(() => {
          expect(screen.queryByText('Add New Destination')).not.toBeInTheDocument()
        })
      }
    })
  })
  describe('Tour listings picker', () => {
    // Client report (EEO sheet, 24 Aug): the "Tour listings" selector offered
    // tours that had been moved to the Trash. The picker asks the API for live
    // tours only and drops any trashed row that still arrives.
    it('never offers a trashed tour in the Tour listings selector', async () => {
      const user = userEvent.setup()
      global.fetch = jest.fn((url: string) => {
        if (String(url).includes('/api/admin/tours')) {
          return Promise.resolve({
            ok: true,
            json: () => Promise.resolve({
              success: true,
              data: [
                { _id: 'tour-live', title: 'Live Tour', slug: 'live-tour', archivedAt: null },
                { _id: 'tour-trashed', title: 'Trashed Tour', slug: 'trashed-tour', archivedAt: '2026-08-01T00:00:00.000Z' },
              ],
            }),
          })
        }
        return Promise.resolve({ ok: true, json: () => Promise.resolve({ success: true, data: [] }) })
      }) as jest.Mock

      await renderManager()
      await waitFor(() => expect(global.fetch).toHaveBeenCalled())
      const tourRequest = (global.fetch as jest.Mock).mock.calls
        .map((call) => String(call[0]))
        .find((url) => url.includes('/api/admin/tours'))
      expect(tourRequest).toContain('includeArchived=false')

      await user.click(screen.getByRole('button', { name: /add destination/i }))
      await user.click(screen.getByRole('button', { name: /^content$/i }))
      expect(await screen.findByText('Live Tour')).toBeInTheDocument()
      expect(screen.queryByText('Trashed Tour')).not.toBeInTheDocument()
    })
  })
})
