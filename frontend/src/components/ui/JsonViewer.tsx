import React from 'react';

interface JsonViewerProps {
  data: unknown;
}

export const JsonViewer: React.FC<JsonViewerProps> = ({ data }) => {
  return (
    <div className="json-viewer">
      {JSON.stringify(data, null, 2)}
    </div>
  );
};
