import parse from 'html-react-parser';

function RenderHTML({ content }) {
  return <div>{parse(content)}</div>;
}

export default RenderHTML;