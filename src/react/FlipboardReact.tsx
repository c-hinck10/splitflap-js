import {
  forwardRef,
  useEffect,
  useImperativeHandle,
  useRef
} from 'react';
import {
  Flipboard as FlipboardCore,
  type FlipboardOptions,
  type TriggerMode
} from '../core/Flipboard';

export type FlipboardHandle = {
  setMessage: (message: string) => void;
  setMessages: (messages: string[]) => void;
  setPages: (pages: FlipboardOptions['pages']) => void;
  play: (index?: number) => void;
  next: () => void;
  reset: () => void;
};

export type FlipboardProps = FlipboardOptions & {
  className?: string;
  trigger?: TriggerMode;
};

export const Flipboard = forwardRef<FlipboardHandle, FlipboardProps>(
  function Flipboard(
    {
      className,
      size,
      rows,
      cols,
      align,
      preserveWords,
      tone,
      theme,
      trigger,
      stagger,
      staggerMode,
      flipDuration,
      charset,
      faces,
      shadow,
      tileShadow,
      loop,
      autoplay,
      pageDuration,
      paginate,
      messages,
      pages,
      startIndex,
      respectReducedMotion,
      pauseWhenHidden,
      responsive,
      performanceMode,
      flipDirection,
      onComplete
    },
    ref
  ) {
    const containerRef = useRef<HTMLDivElement | null>(null);
    const boardRef = useRef<FlipboardCore | null>(null);

    useImperativeHandle(
      ref,
      () => ({
        setMessage: (message) => boardRef.current?.setMessage(message),
        setMessages: (nextMessages) =>
          boardRef.current?.setMessages(nextMessages),
        setPages: (nextPages) => boardRef.current?.setPages(nextPages ?? []),
        play: (index) => boardRef.current?.play(index),
        next: () => boardRef.current?.next(),
        reset: () => boardRef.current?.reset()
      }),
      []
    );

    useEffect(() => {
      if (!containerRef.current) {
        return undefined;
      }

      const board = new FlipboardCore(containerRef.current, removeUndefined({
        size,
        rows,
        cols,
        align,
        preserveWords,
        tone,
        theme,
        trigger,
        stagger,
        staggerMode,
        flipDuration,
        charset,
        faces,
        shadow,
        tileShadow,
        loop,
        autoplay,
        pageDuration,
        paginate,
        messages,
        pages,
        startIndex,
        respectReducedMotion,
        pauseWhenHidden,
        responsive,
        performanceMode,
        flipDirection,
        onComplete
      }));

      boardRef.current = board;

      return () => {
        board.destroy();
        boardRef.current = null;
      };
    }, [
      size,
      rows,
      cols,
      align,
      preserveWords,
      tone,
      theme,
      trigger,
      stagger,
      staggerMode,
      flipDuration,
      charset,
      faces,
      shadow,
      tileShadow,
      loop,
      autoplay,
      pageDuration,
      paginate,
      pages,
      startIndex,
      respectReducedMotion,
      pauseWhenHidden,
      responsive,
      performanceMode,
      flipDirection,
      onComplete
    ]);

    useEffect(() => {
      if (pages && pages.length > 0) {
        boardRef.current?.setPages(pages);
        return;
      }

      if (messages) {
        boardRef.current?.setMessages(messages);
      }
    }, [messages, pages]);

    return <div ref={containerRef} className={className} />;
  }
);

function removeUndefined<T extends Record<string, unknown>>(value: T): T {
  return Object.fromEntries(
    Object.entries(value).filter(([, entry]) => entry !== undefined)
  ) as T;
}
