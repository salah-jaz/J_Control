import { useState } from 'react';
import InvoiceView1 from './InvoiceView';
import InvoiceView2 from './InvoiceView2';
import InvoiceView3 from './InvoiceView3';

const InvoiceViewer = (props) => {
    const [activeTemplate, setActiveTemplate] = useState(1);

    const commonProps = {
        ...props,
        activeTemplate,
        onTemplateChange: setActiveTemplate
    };

    switch (activeTemplate) {
        case 2:
            return <InvoiceView2 {...commonProps} />;
        case 3:
            return <InvoiceView3 {...commonProps} />;
        default:
            return <InvoiceView1 {...commonProps} />;
    }
};

export default InvoiceViewer;
