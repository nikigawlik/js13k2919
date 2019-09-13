# Pizza Undelivery #

https://js13kgames.com/entries/pizza-undelivery

Here you bring pizzas back to the pizzeria, instead of the other way around. 
This retro style racing game is about navigating a randomly generated 3D city 
in your 1986 Toyota Corolla, while listening to hand-coded floatbeat music 
and sound effects. Another highlight is the custom 3D rendering engine 
implemented in JavaScript (that might not work on slower machines, sorry).

This game was made for the 2019 js13kgames competition. The point of the 
competition is to make a browser game in JavaScript that fits into a 13kb 
.zip archive. Surprisingly, the final archive size turned out to be 8250 
bytes, significantly undershooting the limit.

# Technical Overview #

My approach to make the 13kb limit was to rely as much on procedural 
content generation as possible and to build everything from the ground up, 
without using any external frameworks. I also do not support pre-ES6 
browsers. While I optimized the code (especially the renderer) to be as 
performant as possible, the basic rendering approach is inherantly slow: I 
am using a custom renderer (based on this algorithm: 
https://github.com/s-macke/VoxelSpace) to render the entire world to to the 
canvas by manipulating the image data of the canvas directly. This means a 
lot of calculation is done directly in JavaScript. This approach lead to 
an very retro artstyle and some interesting artistic liberties (like the wavy 
floor).

A noteworthy part of this game is the soundtrack which (in my opinion) is 
quite complex for the amount of space it requires (it is generated in the 
audio.js file). It is based on the idea of bytebeat/floatbeat 
(https://github.com/greggman/html5bytebeat) where the music is expressed 
as a mathematical function dependant on the value of the the time/sample 
index t. You can simply create some floatbeat by writing to an AudioBuffer 
and playing it back with WebAudioAPI. I also took advantage of the fact that 
you can access the audio buffer while writing it to create an echo effect in 
the music.
