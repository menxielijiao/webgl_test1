import Common from "./Common"

 export default class MyGL {
   
   constructor(props) {
     this.props = props
     this.init()
   }

   init() {
     Common.init(this.props.$canvas)
   }
 }