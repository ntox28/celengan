import React from 'react';

const SupplierIcon: React.FC<React.SVGProps<SVGSVGElement>> = (props) => (
  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
    <path d="M21.5 12.55a1 1 0 0 1-1 1h-17a1 1 0 0 1-1-1v-5a1 1 0 0 1 1-1h17a1 1 0 0 1 1 1Z" />
    <path d="m3.5 13.5 4-3 4 3 4-3 4 3" />
    <path d="M2 18h20" />
    <path d="M4 18v2" />
    <path d="M20 18v2" />
    <path d="M12 13.5V6.5" />
    <path d="M12 4.5a2 2 0 1 0 0-4 2 2 0 0 0 0 4Z" />
  </svg>
);

export default SupplierIcon;