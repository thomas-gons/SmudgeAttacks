import * as React from "react";

const thumbsContainer: React.CSSProperties = {
  display: 'flex',
  flexDirection: 'row',
  flexWrap: 'wrap',
  marginTop: 16
};

const thumb: React.CSSProperties = {
  display: 'inline-flex',
  borderRadius: 2,
  border: '1px solid #eaeaea',
  marginBottom: 8,
  marginRight: 8,
  width: 100,
  height: 100,
  padding: 4,
};

const thumbInner: React.CSSProperties = {
  display: 'flex',
  minWidth: 0,
  overflow: 'hidden'
};

const imgStyle = {display: 'block', width: 'auto', height: '100%'};


const Thumb = (
  smudgedPhoneImages: File[]
) => {

  const thumbs = smudgedPhoneImages.map(image => (
    <div style={thumb} key={image.name}>
      <div style={thumbInner}>
        <img src={image.preview} alt={image.name} style={imgStyle} onLoad={() => URL.revokeObjectURL(image.preview)}/>
      </div>
    </div>
  ))

  return (
    <aside style={thumbsContainer}>
      {thumbs}
    </aside>
  )
}

export default Thumb;