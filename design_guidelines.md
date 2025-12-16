# 562 Tyres Management System - Design Guidelines

## Design Approach
**System**: Material Design-inspired for data-rich, productivity-focused application
**Rationale**: Internal management system requiring efficient data entry, clear information hierarchy, and robust form handling

## Typography System
- **Primary Font**: Inter or Roboto via Google Fonts CDN
- **Headers**: 
  - Page Titles: text-2xl font-semibold
  - Section Headers: text-xl font-medium
  - Card Headers: text-lg font-medium
- **Body Text**: text-base for primary content, text-sm for secondary info, labels
- **Data Display**: font-mono for SKUs, prices, quantities
- **Emphasis**: font-semibold for totals, alerts, key metrics

## Layout System
**Spacing Units**: Tailwind units 2, 4, 6, 8, 12, 16 for consistent rhythm
- Component padding: p-6
- Card spacing: gap-6
- Form field spacing: space-y-4
- Section margins: mb-8
- Page padding: p-8

**Container Structure**:
- Max width: max-w-7xl for main content area
- Sidebar navigation: w-64 fixed
- Main content: flex-1 with proper padding
- Forms/Modals: max-w-2xl centered

## Component Library

### Navigation
- Fixed sidebar with logo at top, navigation menu items with icons (Heroicons), user profile at bottom
- Top header bar with page title, search, and quick actions (New Sale, Add Inventory buttons)
- Breadcrumb navigation for deeper sections

### Dashboard & Analytics
- Metric cards in grid (grid-cols-1 md:grid-cols-2 lg:grid-cols-4)
- Each card: Large number display, descriptive label, trend indicator, icon
- Charts using Chart.js: Line charts for sales trends, bar charts for inventory levels, donut for category breakdown

### Data Tables
- Striped rows for readability
- Fixed header with sorting indicators
- Action column (right-aligned) with icon buttons for edit/delete
- Pagination controls at bottom
- Search and filter controls above table
- Alternating row treatment for visual scanning
- Sticky headers for long tables

### Forms
**Sales Form Structure**:
- Two-column layout on desktop (grid-cols-2), single on mobile
- Section grouping: Customer Info, Items, Pricing, Payment
- Item selection: Searchable dropdown with SKU, name, current stock display
- Line items table: Product, Quantity (with stock validation), Unit Price, Tax, Subtotal
- Add/Remove item buttons
- Running totals sidebar: Subtotal, Global Tax, Per-Item Taxes, Grand Total
- Action buttons: Save Draft, Generate Invoice, Complete Sale

**Input Fields**:
- Consistent height and padding across all inputs
- Clear labels above fields
- Helper text below inputs for guidance
- Error states with inline messaging
- Required field indicators
- Number inputs with increment/decrement controls for quantities

### Inventory Management
- Product cards in grid for quick view (grid-cols-1 md:grid-cols-2 lg:grid-cols-3)
- Each card: Product image placeholder, SKU, name, category badge, stock level with visual indicator, quick edit button
- List view option with comprehensive table
- Low-stock indicators: Visual alert badges, distinct styling
- Bulk actions toolbar: Delete, Export, Update Stock

### Modals & Overlays
- Import CSV/XLSX modal: Drag-drop zone, file preview table, mapping interface, import validation feedback
- Invoice preview: Full-page modal with PDF renderer, download/print controls
- Confirmation dialogs for destructive actions
- Toast notifications for success/error feedback (top-right position)

### Reports Section
- Date range picker (preset ranges: Today, This Week, This Month, Custom)
- Report type selector tabs
- Data visualization with export controls
- Download format options: CSV, XLSX with icon buttons

## Animations
**Minimal & Purposeful**:
- Page transitions: None (instant navigation for speed)
- Button feedback: Scale press effect only
- Modal entry: Simple fade-in
- Toast notifications: Slide-in from top-right
- Loading states: Simple spinner, no elaborate animations

## Images
**No hero images** - This is a functional internal tool
**Product Images**: Placeholder thumbnails in inventory cards and sales form (64x64 or 80x80), positioned left of product details

## Accessibility
- Consistent form input implementation with proper labels and ARIA attributes
- Keyboard navigation support throughout
- Focus indicators on all interactive elements
- Skip-to-content links for keyboard users
- Error messages associated with form fields
- Sufficient contrast for text and interactive elements

## Mobile Considerations
- Responsive tables: Horizontal scroll with touch indicators
- Collapsible sidebar menu on mobile
- Stacked form layouts
- Touch-friendly button sizes (min-h-12)
- Bottom sheet modals for mobile actions