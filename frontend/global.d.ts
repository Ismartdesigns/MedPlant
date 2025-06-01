declare namespace JSX {
  interface IntrinsicElements {
    'model-viewer': React.DetailedHTMLProps<React.HTMLAttributes<HTMLElement>, HTMLElement> & {
      src?: string;
      alt?: string;
      'auto-rotate'?: string;
      'camera-controls'?: string;
      'disable-zoom'?: string;
      ar?: string;
      'shadow-intensity'?: string;
      exposure?: string;
      style?: React.CSSProperties;
      slot?: string;
      // Add other model-viewer attributes as needed
    };
  }
} 