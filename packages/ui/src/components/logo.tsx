import { type ComponentProps } from "solid-js"

// [AoG] Hub mark: rounded square + H bars + hub node. Theme-aware like the
// original mark so it adapts to light/dark themes automatically.
export const Mark = (props: { class?: string }) => {
  return (
    <svg
      data-component="logo-mark"
      classList={{ [props.class ?? ""]: !!props.class }}
      viewBox="0 0 20 20"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <rect data-slot="logo-mark-bg" x="1" y="1" width="18" height="18" rx="4.4" fill="var(--icon-strong-base)" />
      <path data-slot="logo-mark-h" d="M5 5h2.6v10H5zM12.4 5H15v10h-2.6zM5 8.9h10v2.2H5z" fill="var(--background-base)" />
      <circle data-slot="logo-mark-node" cx="10" cy="10" r="2.3" fill="#8A7BB8" />
    </svg>
  )
}

export const Splash = (props: Pick<ComponentProps<"svg">, "ref" | "class">) => {
  return (
    <svg
      ref={props.ref}
      data-component="logo-splash"
      classList={{ [props.class ?? ""]: !!props.class }}
      viewBox="0 0 80 100"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <rect x="8" y="14" width="64" height="64" rx="15" fill="var(--icon-strong-base)" />
      <path
        d="M25.6 28.4h9.3v35.2h-9.3zM45.1 28.4h9.3v35.2h-9.3zM25.6 41.9h28.8v8h-28.8z"
        fill="var(--background-base)"
      />
      <circle cx="40" cy="46" r="8.2" fill="#8A7BB8" />
    </svg>
  )
}

export const Logo = (props: { class?: string }) => {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 132 42"
      fill="none"
      classList={{ [props.class ?? ""]: !!props.class }}
    >
      <g>
        <rect x="2" y="2" width="38" height="38" rx="9" fill="var(--icon-strong-base)" />
        <path
          d="M12.4 12.4h5.5v17.2h-5.5zM24.1 12.4h5.5v17.2h-5.5zM12.4 19.4h17.2v3.2H12.4z"
          fill="var(--background-base)"
        />
        <circle cx="21" cy="21" r="4.8" fill="#8A7BB8" />
        <text
          x="48"
          y="31"
          font-size="27"
          font-weight="800"
          font-family="inherit"
          fill="var(--icon-strong-base)"
        >
          Hub
        </text>
      </g>
    </svg>
  )
}
