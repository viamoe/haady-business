// Quick test script to check API response
fetch('http://localhost:3000/api/categories?include_inactive=false')
  .then(r => r.json())
  .then(data => {
    console.log('Total categories:', data.categories?.length || 0);
    const level0 = data.categories?.filter(c => c.level === 0) || [];
    const level1 = data.categories?.filter(c => c.level === 1) || [];
    console.log('Level 0 (Types):', level0.length);
    console.log('Level 1 (Main):', level1.length);
    console.log('Sample Level 0:', level0.slice(0, 2).map(c => ({ id: c.id, name: c.name, type: c.category_type })));
    console.log('Sample Level 1:', level1.slice(0, 3).map(c => ({ id: c.id, name: c.name, parent_id: c.parent_id })));
    
    // Check if main categories have correct parent_id
    const digitalType = level0.find(c => c.category_type === 'digital_surprises');
    if (digitalType) {
      const digitalMains = level1.filter(c => c.parent_id === digitalType.id);
      console.log('Digital Surprises main cats:', digitalMains.length, 'Type ID:', digitalType.id);
      console.log('All level 1 parent_ids:', [...new Set(level1.map(c => c.parent_id))]);
    }
  })
  .catch(console.error);
