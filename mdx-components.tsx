import type { MDXComponents } from 'mdx/types'

export function useMDXComponents(components: MDXComponents): MDXComponents {
  return {
    h1: (props) => <h1 style={{ color: 'darkblue', fontSize: '3.5rem', marginTop: '1.65rem', fontVariationSettings: '"wght" 600', fontFamily: 'ohno-softie-variable', lineHeight: 1.1}} {...props} />,
    h2: (props) => <h2 style={{ color: 'darkblue', fontSize: '2.5rem', marginTop: '1.25rem', fontFamily: 'var(--font-baloo)' }} {...props} />,
    h3: (props) => <h3 style={{ color: 'darkblue', fontSize: '1.75rem', marginTop: '1rem', fontFamily: 'var(--font-baloo)' }} {...props} />,
    h4: (props) => <h4 style={{ color: 'darkblue', fontSize: '1.25rem', marginTop: '0.75rem', fontFamily: 'var(--font-baloo)' }} {...props} />,
    br: (props) => <br style={{ margin: '1rem 0' }} {...props} />,
    p: (props) => <p style={{ lineHeight: '1.6', fontSize: '1rem', marginTop: '1rem', fontFamily: 'var(--font-poppins)' }} {...props} />,
    a: (props) => <a style={{ color: 'teal', textDecoration: 'underline', fontFamily: 'var(--font-poppins)' }} {...props} />,
    li: (props) => <li style={{ margin: '0.5rem 0', fontFamily: 'var(--font-poppins)' }} {...props} />,
    ul: (props) => <ul style={{ paddingLeft: '1.5rem', marginTop: '1rem', listStyleType: 'disc', fontFamily: 'var(--font-poppins)' }} {...props} />,
    ol: (props) => <ol style={{ paddingLeft: '1.5rem', marginTop: '1rem', listStyleType: 'decimal', fontFamily: 'var(--font-poppins)' }} {...props} />,
    ...components,
  }
}