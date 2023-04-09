import { AutoSizer } from "./AutoSizerFC";

const test = [
  <AutoSizer>
    {(size) => {
      const { width, height } = size;
      return (
        <>
          {width}x{height}
        </>
      );
    }}
  </AutoSizer>,
  <AutoSizer disableWidth>
    {(size) => {
      const { width, height } = size;
      return (
        <>
          {width}x{height}
        </>
      );
    }}
  </AutoSizer>,
  <AutoSizer disableHeight>
    {(size) => {
      const { width, height } = size;
      return (
        <>
          {width}x{height}
        </>
      );
    }}
  </AutoSizer>,
  <AutoSizer disableWidth disableHeight>
    {(size) => {
      const { width, height } = size;
      return (
        <>
          {width}x{height}
        </>
      );
    }}
  </AutoSizer>,
  <AutoSizer disableWidth={Math.random() > 0.5}>
    {(size) => {
      const { width, height } = size;
      return (
        <>
          {width}x{height}
        </>
      );
    }}
  </AutoSizer>,
];
