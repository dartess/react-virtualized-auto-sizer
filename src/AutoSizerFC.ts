import {
  createElement,
  CSSProperties,
  HTMLAttributes,
  ReactElement,
  useState,
  useRef,
  useEffect,
} from "react";

// @ts-ignore
import { createDetectElementResize } from "../vendor/detectElementResize";

export type Size = {
  // Legacy width and height parameters (offsetWidth and offsetHeight)
  height?: number;
  width?: number;

  // Take transform:scale into account (getBoundingClientRect)
  scaledHeight?: number;
  scaledWidth?: number;
};

export type Props = {
  children: (size: Size) => ReactElement;
  defaultHeight?: number;
  defaultWidth?: number;
  disableHeight?: boolean;
  disableWidth?: boolean;
  nonce?: string;
  onResize?: (size: Size) => void;
  tagName?: string;
} & Omit<HTMLAttributes<HTMLDivElement>, "children" | "onResize">;

type State = {
  height: number;
  scaledHeight: number;
  scaledWidth: number;
  width: number;
};

type ResizeHandler = (element: HTMLElement, onResize: () => void) => void;

type DetectElementResize = {
  addResizeListener: ResizeHandler;
  removeResizeListener: ResizeHandler;
};

let renderCount = 0;

export const AutoSizer = ({
  children,
  nonce,
  onResize = () => {},
  disableHeight = false,
  disableWidth = false,
  defaultHeight,
  defaultWidth,
  style = {},
  tagName = "div",
  ...rest
}: Props) => {
  const [state, setState] = useState<State>({
    height: defaultHeight || 0,
    scaledHeight: defaultHeight || 0,
    width: defaultWidth || 0,
    scaledWidth: defaultWidth || 0,
  });

  const autoSizerRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    let detectElementResize: DetectElementResize | null = null;
    let parentNode: HTMLElement | null = null;
    let resizeObserver: ResizeObserver | null = null;

    const handleResize = () => {
      if (parentNode) {
        // Guard against AutoSizer component being removed from the DOM immediately after being added.
        // This can result in invalid style values which can result in NaN values if we don't handle them.
        // See issue #150 for more context.

        const style = window.getComputedStyle(parentNode) || {};
        const paddingLeft = parseInt(style.paddingLeft ?? "0", 10);
        const paddingRight = parseInt(style.paddingRight ?? "0", 10);
        const paddingTop = parseInt(style.paddingTop ?? "0", 10);
        const paddingBottom = parseInt(style.paddingBottom ?? "0", 10);

        const rect = parentNode.getBoundingClientRect();
        const scaledHeight = rect.height - paddingTop - paddingBottom;
        const scaledWidth = rect.width - paddingLeft - paddingRight;

        const height = parentNode.offsetHeight - paddingTop - paddingBottom;
        const width = parentNode.offsetWidth - paddingLeft - paddingRight;

        if (
          (!disableHeight &&
            (state.height !== height || state.scaledHeight !== scaledHeight)) ||
          (!disableWidth &&
            (state.width !== width || state.scaledWidth !== scaledWidth))
        ) {
          setState({
            height: height,
            scaledHeight: scaledHeight,
            scaledWidth: scaledWidth,
            width: width,
          });

          if (typeof onResize === "function") {
            onResize({
              height: height,
              scaledHeight: scaledHeight,
              scaledWidth: scaledWidth,
              width: width,
            });
          }
        }
      }
    };

    if (
      autoSizerRef.current &&
      autoSizerRef.current.parentNode &&
      autoSizerRef.current.parentNode.ownerDocument &&
      autoSizerRef.current.parentNode.ownerDocument.defaultView &&
      autoSizerRef.current.parentNode instanceof
        autoSizerRef.current.parentNode.ownerDocument.defaultView.HTMLElement
    ) {
      // Delay access of parentNode until mount.
      // This handles edge-cases where the component has already been unmounted before its ref has been set,
      // As well as libraries like react-lite which have a slightly different lifecycle.
      parentNode = autoSizerRef.current.parentNode;

      // Defer requiring resize handler in order to support server-side rendering.
      // See issue #41
      if (parentNode != null) {
        if (typeof ResizeObserver !== "undefined") {
          resizeObserver = new ResizeObserver(handleResize);
          resizeObserver.observe(parentNode);
        } else {
          detectElementResize = createDetectElementResize(
            nonce
          ) as DetectElementResize;
          detectElementResize.addResizeListener(parentNode, handleResize);
        }

        handleResize();
      }
    }

    return () => {
      if (parentNode) {
        if (detectElementResize) {
          detectElementResize.removeResizeListener(parentNode, handleResize);
        }

        if (resizeObserver) {
          resizeObserver.observe(parentNode);
          resizeObserver.disconnect();
        }
      }
    };
  }, []);

  // Outer div should not force width/height since that may prevent containers from shrinking.
  // Inner component should overflow and use calculated width/height.
  // See issue #68 for more information.
  const outerStyle: CSSProperties = { overflow: "visible" };
  const childParams: Size = {};

  // Avoid rendering children before the initial measurements have been collected.
  // At best this would just be wasting cycles.
  let bailoutOnChildren = false;

  if (!disableHeight) {
    if (state.height === 0) {
      bailoutOnChildren = true;
    }
    outerStyle.height = 0;
    childParams.height = state.height;
    childParams.scaledHeight = state.scaledHeight;
  }

  if (!disableWidth) {
    if (state.width === 0) {
      bailoutOnChildren = true;
    }
    outerStyle.width = 0;
    childParams.width = state.width;
    childParams.scaledWidth = state.scaledWidth;
  }

  return createElement(
    tagName,
    {
      ref: autoSizerRef,
      style: {
        ...outerStyle,
        ...style,
      },
      ...rest,
    },
    !bailoutOnChildren && children(childParams)
  );
};
