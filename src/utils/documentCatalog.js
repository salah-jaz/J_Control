/** Document type options for Invoice / Quotation Basic Info */
export const DOCUMENT_TYPES = [
  'Products',
  'Services',
  'Both Products & Services',
];

/** Line-item catalog filter chips */
export const ITEM_FILTERS = ['All', 'Products', 'Services'];

/** Build a single-line address snapshot from a client record */
export function formatClientAddress(client) {
  if (!client) return '';
  return [
    client.address_line_1,
    client.address_line_2,
    client.city,
    client.state,
    client.pincode,
    client.country,
  ]
    .map((p) => (p == null ? '' : String(p).trim()))
    .filter(Boolean)
    .join(', ');
}

/** Snapshot contact fields used on invoice/quotation */
export function getClientContactSnapshot(client) {
  if (!client) {
    return { client_address: '', client_phone: '', client_email: '' };
  }
  return {
    client_address: formatClientAddress(client),
    client_phone: client.mobile_number || client.phone || '',
    client_email: client.email_address || client.email || '',
  };
}

/**
 * Resolve which catalog category filters are allowed for a document type.
 * Returns subset of ITEM_FILTERS.
 */
export function allowedItemFilters(documentType) {
  if (documentType === 'Products') return ['Products'];
  if (documentType === 'Services') return ['Services'];
  return ITEM_FILTERS;
}

/**
 * Filter active catalog items by document type, UI filter, and already-selected IDs.
 */
export function filterCatalogItems({
  products = [],
  documentType = 'Both Products & Services',
  itemFilter = 'All',
  selectedProductIds = [],
  currentProductId = null,
}) {
  const selected = new Set(
    (selectedProductIds || [])
      .filter((id) => id != null && id !== '' && String(id) !== String(currentProductId ?? ''))
      .map((id) => String(id))
  );

  const typeAllowed =
    documentType === 'Products'
      ? ['Product']
      : documentType === 'Services'
        ? ['Service']
        : ['Product', 'Service'];

  const filterAllowed =
    itemFilter === 'Products'
      ? ['Product']
      : itemFilter === 'Services'
        ? ['Service']
        : typeAllowed;

  const categories = typeAllowed.filter((t) => filterAllowed.includes(t));

  return (products || []).filter((p) => {
    if (!p) return false;
    const status = (p.status || 'Active').toString();
    if (status.toLowerCase() !== 'active') return false;
    const pType = (p.type || 'Service').toString();
    if (!categories.includes(pType)) return false;
    if (p.id != null && selected.has(String(p.id))) return false;
    return true;
  });
}

/** Normalize product type label for notes visibility */
export function notesVisibility(documentType) {
  return {
    showProductNotes: documentType === 'Products' || documentType === 'Both Products & Services',
    showServiceNotes: documentType === 'Services' || documentType === 'Both Products & Services',
  };
}
