# CodeMirror Editor

**tag**: `<hpcc-codemirror>`

<ClientOnly>
  <hpcc-vitepress preview_border="0px" preview_height_ratio=0.5 style="width:100%;height:400px">
    <hpcc-codemirror mode="json" theme="dark" style="width:100%;height:100%">
    </hpcc-codemirror>

    <script type="module">
      import "@hpcc-js/wc-editor";

      document.querySelector('hpcc-codemirror').text = `\
      {
        "aaa":123, 
        "bbb":"ddd", 
        "c":3, 
        "d":true
      }`;
    </script>
  </hpcc-vitepress>
</ClientOnly>

::: tip
See [Getting Started](../../../README) for details on how to include @hpcc-js/codemirror in your application
:::

## `HPCCCodemirrorElement`

## Events

## Credits

### CodeMirror

_CodeMirror 6 is a rewrite of the CodeMirror code editor. It greatly improves the library's accessibility and touchscreen support, provides better content analysis and a modern programming interface. The new system matches the existing code in features and performance. It is not API-compatible with the old code._

* [Home Page](https://codemirror.net/6/)
* [GitHub](https://github.com/codemirror/codemirror.next/)


