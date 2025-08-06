import React from 'react';

const ReceiptIcon: React.FC<React.SVGProps<SVGSVGElement>> = (props) => (
  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
    <path d="M4 2v20l2-1 2 1 2-1 2 1 2-1 2 1V2l-2 1-2-1-2 1-2-1-2 1-2-1Z"/>
    <path d="M16 8h-6a2 2 0 1 0 0 4h6"/>
    <path d="M12 17.5.5.5"/>
  </svg>
);

export default ReceiptIcon;